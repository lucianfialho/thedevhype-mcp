import { neon } from "@neondatabase/serverless";

async function checkDependency(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    return { status: "ok" as const, latency: Date.now() - start };
  } catch (err) {
    return {
      status: "error" as const,
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkEndpoint(url: string) {
  const start = Date.now();
  try {
    const res = await fetch(url, { method: "GET" });
    return {
      status: res.ok ? ("ok" as const) : ("error" as const),
      latency: Date.now() - start,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      status: "error" as const,
      latency: Date.now() - start,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const checks: Record<string, { status: string; latency: number; message?: string }> = {};

  // Infrastructure checks
  checks.database = await checkDependency("database", async () => {
    await sql`SELECT 1`;
  });

  // API endpoint checks
  checks["api:/api/health"] = await checkEndpoint(`${baseUrl}/api/health`);
  checks["api:/api/mcp-access"] = await checkEndpoint(`${baseUrl}/api/mcp-access`);

  const hasError = Object.values(checks).some((c) => c.status === "error");
  const status = hasError ? "error" : "ok";

  await fetch("https://www.bluemonitor.org/api/v1/heartbeat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BLUEMONITOR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: "thedevhype.com",
      status,
      timestamp: new Date().toISOString(),
      checks,
    }),
  });

  return Response.json({ ok: true });
}
