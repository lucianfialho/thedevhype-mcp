import { z } from 'zod';
import { eq, and, sql, desc, lte } from 'drizzle-orm';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
import { toolError } from '../errors';
import { socialAccounts, posts } from './rayssa.schema';
import type { Post, SocialAccount } from './rayssa.schema';
import type { McpServerDefinition } from '../types';

// ─── Token Refresh Helper ───

async function refreshTokenIfNeeded(account: SocialAccount): Promise<SocialAccount> {
  if (
    !account.tokenExpiresAt ||
    new Date(account.tokenExpiresAt) > new Date(Date.now() + 60_000)
  ) {
    return account;
  }

  if (!account.refreshToken) {
    throw new Error('Token expired and no refresh token available. Reconnect the account.');
  }

  let tokenUrl: string;
  let headers: Record<string, string>;
  let body: URLSearchParams;

  if (account.platform === 'linkedin') {
    tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });
  } else {
    const clientId = process.env.TWITTER_CLIENT_ID!;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
    tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    };
    body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: account.refreshToken,
    });
  }

  const res = await fetch(tokenUrl, { method: 'POST', headers, body });

  if (!res.ok) {
    const error = await res.text();
    console.error(`[Rayssa] ${account.platform} token refresh failed:`, error);
    throw new Error(`Failed to refresh ${account.platform} token. Reconnect the account.`);
  }

  const data = await res.json();

  const [updated] = await db
    .update(socialAccounts)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? account.refreshToken,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .where(eq(socialAccounts.id, account.id))
    .returning();

  return updated;
}

// ─── Publish Helpers ───

async function publishToTwitter(
  post: Post,
  account: SocialAccount,
  inReplyToId?: string,
): Promise<{ platformPostId: string; platformPostUrl: string }> {
  const body: Record<string, unknown> = { text: post.content };
  if (inReplyToId) {
    body.reply = { in_reply_to_tweet_id: inReplyToId };
  }

  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Twitter API error: ${error.slice(0, 200)}`);
  }

  const data = await res.json();
  const tweetId = data.data.id;
  const tweetUrl = `https://x.com/${account.username}/status/${tweetId}`;
  return { platformPostId: tweetId, platformPostUrl: tweetUrl };
}

async function publishToLinkedIn(
  post: Post,
  account: SocialAccount,
): Promise<{ platformPostId: string; platformPostUrl: string }> {
  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${account.platformUserId}`,
      commentary: post.content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`LinkedIn API error: ${error.slice(0, 200)}`);
  }

  // LinkedIn returns the post URN in the x-restli-id header
  const postUrn = res.headers.get('x-restli-id') || '';
  // Extract activity ID for URL: urn:li:share:123 → 123
  const activityId = postUrn.split(':').pop() || postUrn;
  const postUrl = `https://www.linkedin.com/feed/update/${postUrn}`;

  return { platformPostId: activityId, platformPostUrl: postUrl };
}

export async function publishPost(
  post: Post,
  account: SocialAccount,
  inReplyToId?: string,
): Promise<{ platformPostId: string; platformPostUrl: string }> {
  const freshAccount = await refreshTokenIfNeeded(account);

  try {
    let result: { platformPostId: string; platformPostUrl: string };

    if (freshAccount.platform === 'linkedin') {
      result = await publishToLinkedIn(post, freshAccount);
    } else {
      result = await publishToTwitter(post, freshAccount, inReplyToId);
    }

    await db
      .update(posts)
      .set({
        status: 'published',
        publishedAt: new Date().toISOString(),
        platformPostId: result.platformPostId,
        platformPostUrl: result.platformPostUrl,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, post.id));

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[Rayssa] ${freshAccount.platform} publish failed:`, message);

    await db
      .update(posts)
      .set({
        status: 'failed',
        errorMessage: message.slice(0, 500),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(posts.id, post.id));

    throw err;
  }
}

// ─── Server Definition ───

export const rayssaServer: McpServerDefinition = {
  name: 'rayssa',
  description:
    'Rayssa — Social Media Publisher: create drafts, schedule, and publish posts to X/Twitter and LinkedIn',
  category: 'Social Media Tools',
  icon: '/rayssa.png',
  badge: 'New',
  instructions: `# Rayssa — Social Media Publisher

## Purpose
Rayssa helps you create, schedule, and publish posts to X/Twitter and LinkedIn. Think of it as your MCP-powered Buffer/Later.

## Key Concepts
- **Social Account**: A connected X/Twitter or LinkedIn account authenticated via OAuth 2.0.
- **Post**: Content to publish. Starts as a draft, can be scheduled for later, or published immediately.
- **Thread**: A sequence of posts published as replies to each other (X/Twitter only). Created atomically.
- **Status Flow**: draft → scheduled → publishing → published (or failed at any point).

## Platform Limits
- **X/Twitter**: 280 characters per tweet. Supports threads.
- **LinkedIn**: 3000 characters per post. No thread support.

## Typical Workflows
1. **Quick Post**: \`create_post\` → \`publish_now\`
2. **Scheduled Post**: \`create_post\` → \`schedule_post\` (publishes automatically at scheduled time)
3. **Thread (X only)**: \`create_thread\` → \`publish_now\` (publishes first post, which chains the rest)
4. **Draft & Refine**: \`create_post\` → \`edit_post\` → \`publish_now\`

## Conventions
- IDs are numeric integers.
- Dates must be ISO 8601 format (e.g. "2025-01-15T14:30:00Z").
- Post content limit depends on platform: 280 chars (X) or 3000 chars (LinkedIn).
- Connect an account first via the dashboard before using post tools.`,
  tools: [
    {
      name: 'list_accounts',
      description:
        'List connected social media accounts. Returns account ID, platform, username, and display name. Use to verify an account is connected before creating posts. Read-only.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'create_post',
      description:
        'Create a new draft post. Requires content text and accountId. Returns the created post object. The post starts as a draft — use schedule_post or publish_now to publish it.',
    },
    {
      name: 'edit_post',
      description:
        'Edit the content of a draft or scheduled post. Only works for posts that have not been published yet. Idempotent — setting the same content is a no-op.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'list_posts',
      description:
        'List posts filtered by status: draft, scheduled, published, or failed. Returns post ID, content, status, scheduled/published dates. Ordered by most recent first. Read-only.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'get_post',
      description:
        'Get full details of a single post by ID. Returns content, status, platform post ID/URL if published, error message if failed, and thread info. Read-only.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'schedule_post',
      description:
        'Schedule a draft post for future publishing. Requires postId and scheduledAt (ISO 8601 datetime). The post will be automatically published at the scheduled time by the cron job.',
    },
    {
      name: 'unschedule_post',
      description:
        'Move a scheduled post back to draft status. Removes the scheduledAt date. Only works for posts with status "scheduled".',
    },
    {
      name: 'publish_now',
      description:
        'Publish a draft or scheduled post immediately to X/Twitter or LinkedIn. For threads (X only), publishes all posts in sequence. Returns the post URL on success.',
    },
    {
      name: 'delete_post',
      description:
        'Permanently delete a draft or scheduled post. Cannot delete published posts. Destructive — the post is permanently removed.',
      annotations: { destructiveHint: true },
    },
    {
      name: 'create_thread',
      description:
        'Create a thread (multiple posts linked together). Provide an array of content strings and an accountId. Creates all posts as drafts with threadParentId and threadOrder set. Use publish_now on the first post to publish the entire thread.',
    },
  ],
  init: (server) => {
    // ─── list_accounts ───
    server.tool(
      'list_accounts',
      'List connected social media accounts. Returns account ID, platform, username, and display name. Read-only.',
      {},
      { readOnlyHint: true },
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const accounts = await db
          .select({
            id: socialAccounts.id,
            platform: socialAccounts.platform,
            username: socialAccounts.username,
            displayName: socialAccounts.displayName,
            createdAt: socialAccounts.createdAt,
          })
          .from(socialAccounts)
          .where(eq(socialAccounts.userId, userId));

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(accounts, null, 2) }],
        };
      },
    );

    // ─── create_post ───
    server.tool(
      'create_post',
      'Create a new draft post. Requires content text and accountId. Returns the created post object.',
      {
        content: z.string().min(1).max(3000).describe('Post content (max 280 chars for X, 3000 for LinkedIn)'),
        accountId: z.number().describe('Social account ID — get from list_accounts'),
      },
      async ({ content, accountId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [account] = await db
          .select()
          .from(socialAccounts)
          .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, userId)));
        if (!account) {
          return toolError(
            'Account not found.',
            'Use list_accounts to see your connected accounts and their IDs.',
          );
        }

        const [post] = await db
          .insert(posts)
          .values({ userId, accountId, content })
          .returning();

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(post, null, 2) }],
        };
      },
    );

    // ─── edit_post ───
    server.tool(
      'edit_post',
      'Edit the content of a draft or scheduled post. Only works for unpublished posts.',
      {
        postId: z.number().describe('Post ID — get from list_posts'),
        content: z.string().min(1).max(3000).describe('New content (max 280 chars for X, 3000 for LinkedIn)'),
      },
      { idempotentHint: true },
      async ({ postId, content }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
        if (!post) {
          return toolError('Post not found.', 'Use list_posts to see your posts.');
        }
        if (post.status === 'published' || post.status === 'publishing') {
          return toolError(
            'Cannot edit a published or publishing post.',
            'Only draft or scheduled posts can be edited.',
          );
        }

        const [updated] = await db
          .update(posts)
          .set({ content, updatedAt: new Date().toISOString() })
          .where(eq(posts.id, postId))
          .returning();

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }],
        };
      },
    );

    // ─── list_posts ───
    server.tool(
      'list_posts',
      'List posts filtered by status. Ordered by most recent first. Read-only.',
      {
        status: z
          .enum(['draft', 'scheduled', 'published', 'failed'])
          .optional()
          .default('draft')
          .describe('Filter by status'),
        limit: z.number().int().min(1).max(100).optional().default(20),
      },
      { readOnlyHint: true },
      async ({ status, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const result = await db
          .select()
          .from(posts)
          .where(and(eq(posts.userId, userId), eq(posts.status, status)))
          .orderBy(desc(posts.createdAt))
          .limit(limit);

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      },
    );

    // ─── get_post ───
    server.tool(
      'get_post',
      'Get full details of a single post by ID. Read-only.',
      {
        postId: z.number().describe('Post ID'),
      },
      { readOnlyHint: true },
      async ({ postId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, postId), eq(posts.userId, userId)));

        if (!post) {
          return toolError('Post not found.', 'Use list_posts to see your posts.');
        }

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(post, null, 2) }],
        };
      },
    );

    // ─── schedule_post ───
    server.tool(
      'schedule_post',
      'Schedule a draft post for future publishing. Requires ISO 8601 datetime.',
      {
        postId: z.number().describe('Post ID — get from list_posts'),
        scheduledAt: z
          .string()
          .describe('ISO 8601 datetime for when to publish (e.g. "2025-01-15T14:30:00Z")'),
      },
      async ({ postId, scheduledAt }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
        if (!post) {
          return toolError('Post not found.', 'Use list_posts to see your posts.');
        }
        if (post.status !== 'draft') {
          return toolError(
            `Cannot schedule a post with status "${post.status}".`,
            'Only draft posts can be scheduled.',
          );
        }

        const scheduledDate = new Date(scheduledAt);
        if (isNaN(scheduledDate.getTime())) {
          return toolError('Invalid date format.', 'Use ISO 8601 format: "2025-01-15T14:30:00Z".');
        }
        if (scheduledDate <= new Date()) {
          return toolError(
            'Scheduled time must be in the future.',
            'Use publish_now to publish immediately instead.',
          );
        }

        const [updated] = await db
          .update(posts)
          .set({
            status: 'scheduled',
            scheduledAt: scheduledDate.toISOString(),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(posts.id, postId))
          .returning();

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }],
        };
      },
    );

    // ─── unschedule_post ───
    server.tool(
      'unschedule_post',
      'Move a scheduled post back to draft status. Removes the scheduledAt date.',
      {
        postId: z.number().describe('Post ID — get from list_posts'),
      },
      async ({ postId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
        if (!post) {
          return toolError('Post not found.', 'Use list_posts to see your posts.');
        }
        if (post.status !== 'scheduled') {
          return toolError(
            `Cannot unschedule a post with status "${post.status}".`,
            'Only scheduled posts can be unscheduled.',
          );
        }

        const [updated] = await db
          .update(posts)
          .set({
            status: 'draft',
            scheduledAt: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(posts.id, postId))
          .returning();

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }],
        };
      },
    );

    // ─── publish_now ───
    server.tool(
      'publish_now',
      'Publish a draft or scheduled post immediately to X/Twitter. For threads, publishes all posts in sequence. Returns the tweet URL.',
      {
        postId: z.number().describe('Post ID — get from list_posts'),
      },
      async ({ postId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
        if (!post) {
          return toolError('Post not found.', 'Use list_posts to see your posts.');
        }
        if (post.status !== 'draft' && post.status !== 'scheduled') {
          return toolError(
            `Cannot publish a post with status "${post.status}".`,
            'Only draft or scheduled posts can be published.',
          );
        }

        const [account] = await db
          .select()
          .from(socialAccounts)
          .where(and(eq(socialAccounts.id, post.accountId), eq(socialAccounts.userId, userId)));
        if (!account) {
          return toolError(
            'Connected account not found.',
            'Reconnect your X account in the dashboard.',
          );
        }

        // Mark as publishing
        await db
          .update(posts)
          .set({ status: 'publishing', updatedAt: new Date().toISOString() })
          .where(eq(posts.id, postId));

        try {
          // Check if this is a thread parent
          const threadPosts = await db
            .select()
            .from(posts)
            .where(
              and(
                eq(posts.userId, userId),
                eq(posts.threadParentId, postId),
              ),
            )
            .orderBy(posts.threadOrder);

          if (threadPosts.length > 0) {
            // Publish thread: first the parent, then each reply
            const { platformPostId: parentTweetId, platformPostUrl } = await publishPost(
              post,
              account,
            );

            let lastTweetId = parentTweetId;
            for (const threadPost of threadPosts) {
              await db
                .update(posts)
                .set({ status: 'publishing', updatedAt: new Date().toISOString() })
                .where(eq(posts.id, threadPost.id));

              const result = await publishPost(threadPost, account, lastTweetId);
              lastTweetId = result.platformPostId;
            }

            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Thread published (${threadPosts.length + 1} tweets).\nFirst tweet: ${platformPostUrl}`,
                },
              ],
            };
          }

          // Single post
          const { platformPostUrl } = await publishPost(post, account);

          return {
            content: [
              {
                type: 'text' as const,
                text: `Published: ${platformPostUrl}`,
              },
            ],
          };
        } catch (err) {
          console.error('[Rayssa] Publish failed:', err);
          return toolError(
            `Publish failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            'Check your X account connection and try again.',
          );
        }
      },
    );

    // ─── delete_post ───
    server.tool(
      'delete_post',
      'Permanently delete a draft or scheduled post. Cannot delete published posts.',
      {
        postId: z.number().describe('Post ID — get from list_posts'),
      },
      { destructiveHint: true },
      async ({ postId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [post] = await db
          .select()
          .from(posts)
          .where(and(eq(posts.id, postId), eq(posts.userId, userId)));
        if (!post) {
          return toolError('Post not found.', 'Use list_posts to see your posts.');
        }
        if (post.status === 'published') {
          return toolError(
            'Cannot delete a published post.',
            'Published posts are permanent records.',
          );
        }

        // If thread parent, also delete thread children
        await db
          .delete(posts)
          .where(and(eq(posts.threadParentId, postId), eq(posts.userId, userId)));

        await db.delete(posts).where(eq(posts.id, postId));

        return {
          content: [
            {
              type: 'text' as const,
              text: `Post deleted: "${post.content.slice(0, 50)}${post.content.length > 50 ? '...' : ''}"`,
            },
          ],
        };
      },
    );

    // ─── create_thread ───
    server.tool(
      'create_thread',
      'Create a thread (multiple linked posts). Provide an array of content strings and an accountId. All posts start as drafts. Use publish_now on the first post ID to publish the entire thread.',
      {
        contents: z
          .array(z.string().min(1).max(3000))
          .min(2)
          .max(25)
          .describe('Array of post contents (2-25 items, max 280 chars each for X)'),
        accountId: z.number().describe('Social account ID — get from list_accounts'),
      },
      async ({ contents, accountId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [account] = await db
          .select()
          .from(socialAccounts)
          .where(and(eq(socialAccounts.id, accountId), eq(socialAccounts.userId, userId)));
        if (!account) {
          return toolError(
            'Account not found.',
            'Use list_accounts to see your connected accounts.',
          );
        }

        // Create the first post (thread parent)
        const [parent] = await db
          .insert(posts)
          .values({ userId, accountId, content: contents[0] })
          .returning();

        // Create the rest as children
        const children = [];
        for (let i = 1; i < contents.length; i++) {
          const [child] = await db
            .insert(posts)
            .values({
              userId,
              accountId,
              content: contents[i],
              threadParentId: parent.id,
              threadOrder: i,
            })
            .returning();
          children.push(child);
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  threadParentId: parent.id,
                  totalPosts: contents.length,
                  posts: [parent, ...children].map((p) => ({
                    id: p.id,
                    content: p.content,
                    threadOrder: p.threadOrder ?? 0,
                  })),
                  hint: `Use publish_now with postId=${parent.id} to publish the entire thread.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      },
    );
  },
};
