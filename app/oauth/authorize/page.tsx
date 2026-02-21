import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { McpOAuthClientsStore } from '@/app/lib/mcp/oauth-clients-store';

const clientsStore = new McpOAuthClientsStore();

export default async function OAuthConsentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const clientId = params.client_id;
  const redirectUri = params.redirect_uri;
  const state = params.state;
  const codeChallenge = params.code_challenge;
  const codeChallengeMethod = params.code_challenge_method;
  const scope = params.scope ?? 'mcp:tools';
  const resource = params.resource;
  const responseType = params.response_type;

  // Validate required params
  if (!clientId || !redirectUri || !codeChallenge || !codeChallengeMethod) {
    return (
      <main className="container mx-auto flex grow flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">Invalid Request</h1>
          <p className="text-sm text-red-600">Missing required OAuth parameters.</p>
        </div>
      </main>
    );
  }

  if (codeChallengeMethod !== 'S256') {
    return (
      <main className="container mx-auto flex grow flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">Unsupported Challenge Method</h1>
          <p className="text-sm text-red-600">Only S256 PKCE is supported.</p>
        </div>
      </main>
    );
  }

  if (responseType && responseType !== 'code') {
    return (
      <main className="container mx-auto flex grow flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">Unsupported Response Type</h1>
          <p className="text-sm text-red-600">Only &quot;code&quot; response type is supported.</p>
        </div>
      </main>
    );
  }

  // Check if user is logged in
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) {
    // Redirect to login, then back here
    const currentUrl = new URL('/oauth/authorize', 'https://www.thedevhype.com');
    for (const [key, value] of Object.entries(params)) {
      if (value) currentUrl.searchParams.set(key, value);
    }
    redirect(`/auth/sign-in?callbackURL=${encodeURIComponent(currentUrl.pathname + currentUrl.search)}`);
  }

  // Validate client
  const client = await clientsStore.getClient(clientId);
  if (!client) {
    return (
      <main className="container mx-auto flex grow flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">Unknown Application</h1>
          <p className="text-sm text-red-600">The client application is not registered.</p>
        </div>
      </main>
    );
  }

  // Validate redirect_uri
  if (!client.redirect_uris.includes(redirectUri)) {
    return (
      <main className="container mx-auto flex grow flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold text-red-800">Invalid Redirect</h1>
          <p className="text-sm text-red-600">The redirect URI is not registered for this application.</p>
        </div>
      </main>
    );
  }

  const clientName = client.client_name || clientId;
  const scopes = scope.split(' ').filter(Boolean);

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-neutral-900">Authorize Application</h1>
          <p className="mt-1 text-sm text-neutral-500">
            <strong className="text-neutral-700">{clientName}</strong> wants to access your TheDevHype account.
          </p>
        </div>

        <div className="mb-6 rounded-md border border-neutral-100 bg-neutral-50 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Permissions requested
          </p>
          <ul className="space-y-2">
            {scopes.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-neutral-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {s === 'mcp:tools' ? 'Use MCP tools on your behalf' : s}
              </li>
            ))}
          </ul>
        </div>

        <p className="mb-4 text-xs text-neutral-400">
          Signed in as <strong className="text-neutral-600">{user.email ?? user.name}</strong>
        </p>

        <form action="/api/oauth/authorize" method="POST" className="flex gap-3">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="redirect_uri" value={redirectUri} />
          <input type="hidden" name="code_challenge" value={codeChallenge} />
          {state && <input type="hidden" name="state" value={state} />}
          {scope && <input type="hidden" name="scope" value={scope} />}
          {resource && <input type="hidden" name="resource" value={resource} />}

          <button
            type="submit"
            name="action"
            value="deny"
            className="flex-1 rounded-md border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
          >
            Deny
          </button>
          <button
            type="submit"
            name="action"
            value="approve"
            className="flex-1 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Authorize
          </button>
        </form>
      </div>
    </main>
  );
}
