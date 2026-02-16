import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { articles, linkClicks } from '@/app/lib/mcp/servers/eloa.schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const homeUrl = new URL('/', request.url);

  try {
    const { code } = await params;

    const [article] = await db
      .select({ id: articles.id, url: articles.url })
      .from(articles)
      .where(eq(articles.shortCode, code));

    if (!article) {
      return NextResponse.redirect(homeUrl, 302);
    }

    // Fire-and-forget click tracking
    const headers = request.headers;
    db.insert(linkClicks)
      .values({
        articleId: article.id,
        userAgent: headers.get('user-agent') || null,
        referer: headers.get('referer') || null,
        ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      })
      .catch(() => {});

    return NextResponse.redirect(new URL(article.url), 302);
  } catch {
    return NextResponse.redirect(homeUrl, 302);
  }
}
