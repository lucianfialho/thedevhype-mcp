'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { socialAccounts, posts } from '@/app/lib/mcp/servers/rayssa.schema';
import type { SocialAccount, Post } from '@/app/lib/mcp/servers/rayssa.schema';
import { publishPost } from '@/app/lib/mcp/servers/rayssa';
import { getUserMcpUsage } from '../components/user-mcp-usage';

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ─── Accounts ───

export async function getAccounts(): Promise<
  Array<{
    id: number;
    platform: string;
    username: string | null;
    displayName: string | null;
    createdAt: string;
  }>
> {
  const userId = await requireUserId();

  return db
    .select({
      id: socialAccounts.id,
      platform: socialAccounts.platform,
      username: socialAccounts.username,
      displayName: socialAccounts.displayName,
      createdAt: socialAccounts.createdAt,
    })
    .from(socialAccounts)
    .where(eq(socialAccounts.userId, userId));
}

export async function disconnectAccount(accountId: number) {
  const userId = await requireUserId();

  const [account] = await db
    .select()
    .from(socialAccounts)
    .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, userId)));
  if (!account) return { error: 'Account not found.' };

  // Delete associated drafts/scheduled posts (not published)
  await db.delete(posts).where(
    and(
      eq(posts.accountId, accountId),
      eq(posts.userId, userId),
      sql`${posts.status} IN ('draft', 'scheduled')`,
    ),
  );

  await db.delete(socialAccounts).where(eq(socialAccounts.id, accountId));

  return { data: { removed: account.username || account.platform } };
}

// ─── Posts ───

export async function getPosts(
  status: 'draft' | 'scheduled' | 'published' | 'failed' = 'draft',
  limit = 20,
): Promise<Post[]> {
  const userId = await requireUserId();

  return db
    .select()
    .from(posts)
    .where(and(eq(posts.userId, userId), eq(posts.status, status)))
    .orderBy(desc(posts.createdAt))
    .limit(limit);
}

export async function getAllPosts(): Promise<{
  drafts: Post[];
  scheduled: Post[];
  published: Post[];
}> {
  const userId = await requireUserId();

  const [drafts, scheduled, published] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, 'draft')))
      .orderBy(desc(posts.createdAt))
      .limit(50),
    db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, 'scheduled')))
      .orderBy(posts.scheduledAt)
      .limit(50),
    db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.status, 'published')))
      .orderBy(desc(posts.publishedAt))
      .limit(50),
  ]);

  return { drafts, scheduled, published };
}

export async function createPost(
  content: string,
  accountId: number,
): Promise<{ data?: Post; error?: string }> {
  try {
    const userId = await requireUserId();

    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, userId)));
    if (!account) return { error: 'Account not found.' };

    const [post] = await db
      .insert(posts)
      .values({ userId, accountId, content })
      .returning();

    return { data: post };
  } catch (err) {
    console.error('createPost error:', err);
    return { error: 'Failed to create post.' };
  }
}

export async function editPost(
  postId: number,
  content: string,
): Promise<{ data?: Post; error?: string }> {
  try {
    const userId = await requireUserId();

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
    if (!post) return { error: 'Post not found.' };
    if (post.status === 'published' || post.status === 'publishing') {
      return { error: 'Cannot edit a published post.' };
    }

    const [updated] = await db
      .update(posts)
      .set({ content, updatedAt: new Date().toISOString() })
      .where(eq(posts.id, postId))
      .returning();

    return { data: updated };
  } catch (err) {
    console.error('editPost error:', err);
    return { error: 'Failed to edit post.' };
  }
}

export async function schedulePost(
  postId: number,
  scheduledAt: string,
): Promise<{ data?: Post; error?: string }> {
  try {
    const userId = await requireUserId();

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
    if (!post) return { error: 'Post not found.' };
    if (post.status !== 'draft') return { error: 'Only drafts can be scheduled.' };

    const date = new Date(scheduledAt);
    if (isNaN(date.getTime())) return { error: 'Invalid date.' };
    if (date <= new Date()) return { error: 'Date must be in the future.' };

    const [updated] = await db
      .update(posts)
      .set({
        status: 'scheduled',
        scheduledAt: date.toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, postId))
      .returning();

    return { data: updated };
  } catch (err) {
    console.error('schedulePost error:', err);
    return { error: 'Failed to schedule post.' };
  }
}

export async function unschedulePost(postId: number): Promise<{ data?: Post; error?: string }> {
  try {
    const userId = await requireUserId();

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
    if (!post) return { error: 'Post not found.' };
    if (post.status !== 'scheduled') return { error: 'Only scheduled posts can be unscheduled.' };

    const [updated] = await db
      .update(posts)
      .set({
        status: 'draft',
        scheduledAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, postId))
      .returning();

    return { data: updated };
  } catch (err) {
    console.error('unschedulePost error:', err);
    return { error: 'Failed to unschedule post.' };
  }
}

export async function publishPostNow(postId: number): Promise<{ data?: string; error?: string }> {
  try {
    const userId = await requireUserId();

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
    if (!post) return { error: 'Post not found.' };
    if (post.status !== 'draft' && post.status !== 'scheduled') {
      return { error: 'Only draft or scheduled posts can be published.' };
    }

    const [account] = await db
      .select()
      .from(socialAccounts)
      .where(and(eq(socialAccounts.id, post.accountId), eq(socialAccounts.userId, userId)));
    if (!account) return { error: 'Account not found. Reconnect your X account.' };

    await db
      .update(posts)
      .set({ status: 'publishing', updatedAt: new Date().toISOString() })
      .where(eq(posts.id, postId));

    // Check for thread children
    const threadPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.userId, userId), eq(posts.threadParentId, postId)))
      .orderBy(posts.threadOrder);

    if (threadPosts.length > 0) {
      const { platformPostId: parentTweetId, platformPostUrl } = await publishPost(post, account);
      let lastTweetId = parentTweetId;
      for (const tp of threadPosts) {
        await db
          .update(posts)
          .set({ status: 'publishing', updatedAt: new Date().toISOString() })
          .where(eq(posts.id, tp.id));
        const result = await publishPost(tp, account, lastTweetId);
        lastTweetId = result.platformPostId;
      }
      return { data: platformPostUrl };
    }

    const { platformPostUrl } = await publishPost(post, account);
    return { data: platformPostUrl };
  } catch (err) {
    console.error('publishPostNow error:', err);
    return { error: err instanceof Error ? err.message : 'Failed to publish.' };
  }
}

export async function deletePost(postId: number): Promise<{ error?: string }> {
  try {
    const userId = await requireUserId();

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
    if (!post) return { error: 'Post not found.' };
    if (post.status === 'published') return { error: 'Cannot delete published posts.' };

    // Delete thread children too
    await db
      .delete(posts)
      .where(and(eq(posts.threadParentId, postId), eq(posts.userId, userId)));

    await db.delete(posts).where(eq(posts.id, postId));
    return {};
  } catch (err) {
    console.error('deletePost error:', err);
    return { error: 'Failed to delete post.' };
  }
}

// ─── Usage ───

export async function getUserRayssaUsage() {
  return getUserMcpUsage('rayssa');
}
