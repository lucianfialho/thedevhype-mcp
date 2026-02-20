import { db } from '@/app/lib/db';
import { posts, socialAccounts } from '@/app/lib/mcp/servers/rayssa.schema';
import { publishPost } from '@/app/lib/mcp/servers/rayssa';
import { eq, and, lte, sql } from 'drizzle-orm';

/**
 * POST /api/v1/rayssa/publish-scheduled
 * Called by cron-service to publish posts whose scheduledAt <= now().
 * Auth: Bearer token (CRON_SECRET).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();

  // Find all scheduled posts ready to publish
  const duePosts = await db
    .select()
    .from(posts)
    .where(and(eq(posts.status, 'scheduled'), lte(posts.scheduledAt, now)));

  let published = 0;
  let failed = 0;
  const errors: Array<{ postId: number; error: string }> = [];

  for (const post of duePosts) {
    try {
      // Get the account
      const [account] = await db
        .select()
        .from(socialAccounts)
        .where(eq(socialAccounts.id, post.accountId));

      if (!account) {
        await db
          .update(posts)
          .set({
            status: 'failed',
            errorMessage: 'Social account not found or disconnected.',
            updatedAt: new Date().toISOString(),
          })
          .where(eq(posts.id, post.id));
        failed++;
        errors.push({ postId: post.id, error: 'Account not found' });
        continue;
      }

      // Mark as publishing
      await db
        .update(posts)
        .set({ status: 'publishing', updatedAt: new Date().toISOString() })
        .where(eq(posts.id, post.id));

      // Check for thread children
      const threadPosts = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.userId, post.userId),
            eq(posts.threadParentId, post.id),
          ),
        )
        .orderBy(posts.threadOrder);

      if (threadPosts.length > 0) {
        // Publish thread
        const { platformPostId: parentTweetId } = await publishPost(post, account);
        let lastTweetId = parentTweetId;
        for (const tp of threadPosts) {
          await db
            .update(posts)
            .set({ status: 'publishing', updatedAt: new Date().toISOString() })
            .where(eq(posts.id, tp.id));
          const result = await publishPost(tp, account, lastTweetId);
          lastTweetId = result.platformPostId;
        }
      } else {
        // Single post
        await publishPost(post, account);
      }

      published++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ postId: post.id, error: message });
      console.error(`[Rayssa Cron] Failed to publish post ${post.id}:`, err);
    }
  }

  return Response.json({
    ok: true,
    total: duePosts.length,
    published,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
