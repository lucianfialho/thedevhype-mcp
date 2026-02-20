'use client';

import type { Post } from '@/app/lib/mcp/servers/rayssa.schema';

interface PublishedTabProps {
  published: Post[];
}

export function PublishedTab({ published }: PublishedTabProps) {
  if (published.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-slate-400">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <p className="text-base text-slate-500">No published posts yet</p>
        <p className="mt-1 text-sm text-slate-400">Your published posts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {published.map((post) => (
        <div
          key={post.id}
          className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
        >
          <p className="whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Published
            </span>
            <span className="text-xs text-slate-400">
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </div>
          {post.platformPostUrl && (
            <a
              href={post.platformPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700"
            >
              {post.platformPostUrl?.includes('linkedin') ? 'View on LinkedIn' : 'View on X'}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
