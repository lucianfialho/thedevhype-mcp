import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { auth } from '@/app/lib/auth/server';

const BOT_PATTERNS = [
  { pattern: /Googlebot/i, name: "googlebot", category: "search_engine" },
  { pattern: /bingbot/i, name: "bingbot", category: "search_engine" },
  { pattern: /YandexBot/i, name: "yandexbot", category: "search_engine" },
  { pattern: /DuckDuckBot/i, name: "duckduckbot", category: "search_engine" },
  { pattern: /GPTBot/i, name: "gptbot", category: "ai_crawler" },
  { pattern: /ChatGPT-User/i, name: "chatgpt-user", category: "ai_crawler" },
  { pattern: /ClaudeBot/i, name: "claudebot", category: "ai_crawler" },
  { pattern: /anthropic-ai/i, name: "anthropic-ai", category: "ai_crawler" },
  { pattern: /PerplexityBot/i, name: "perplexitybot", category: "ai_crawler" },
  { pattern: /Bytespider/i, name: "bytespider", category: "ai_crawler" },
  { pattern: /CCBot/i, name: "ccbot", category: "ai_crawler" },
  { pattern: /Meta-ExternalAgent/i, name: "meta-externalagent", category: "ai_crawler" },
  { pattern: /Google-Extended/i, name: "google-extended", category: "ai_crawler" },
  { pattern: /Twitterbot/i, name: "twitterbot", category: "social" },
  { pattern: /facebookexternalhit/i, name: "facebookbot", category: "social" },
  { pattern: /LinkedInBot/i, name: "linkedinbot", category: "social" },
  { pattern: /SlackBot/i, name: "slackbot", category: "social" },
  { pattern: /Discordbot/i, name: "discordbot", category: "social" },
  { pattern: /TelegramBot/i, name: "telegrambot", category: "social" },
  { pattern: /AhrefsBot/i, name: "ahrefsbot", category: "seo" },
  { pattern: /SemrushBot/i, name: "semrushbot", category: "seo" },
  { pattern: /DotBot/i, name: "dotbot", category: "seo" },
  { pattern: /MJ12bot/i, name: "mj12bot", category: "seo" },
  { pattern: /Baiduspider/i, name: "baiduspider", category: "search_engine" },
  { pattern: /UptimeRobot/i, name: "uptimerobot", category: "monitoring" },
  { pattern: /Pingdom/i, name: "pingdom", category: "monitoring" },
];

function identifyBot(ua: string) {
  for (const bot of BOT_PATTERNS) {
    if (bot.pattern.test(ua)) return { name: bot.name, category: bot.category };
  }
  return null;
}

const authProxy = auth.middleware({
  loginUrl: '/auth/sign-in',
});

const AUTH_PATHS = ['/dashboard', '/waitlist', '/onboarding'];

function trackBot(bot: { name: string; category: string }, pathname: string, ua: string) {
  return fetch("https://www.bluemonitor.org/api/v1/bot-visits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BLUEMONITOR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "thedevhype.com",
      visits: [{
        bot_name: bot.name,
        bot_category: bot.category,
        path: pathname,
        user_agent: ua,
      }],
    }),
  }).catch(() => {});
}

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const ua = request.headers.get("user-agent") || "";
  const bot = identifyBot(ua);

  if (bot) {
    event.waitUntil(trackBot(bot, request.nextUrl.pathname, ua));
  }

  const pathname = request.nextUrl.pathname;
  const needsAuth = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (needsAuth) {
    // Server actions use the Next-Action header — let them pass through
    const isServerAction = request.headers.has('Next-Action');
    if (!isServerAction) {
      return authProxy(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
