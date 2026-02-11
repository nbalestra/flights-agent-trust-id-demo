/**
 * PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
 * Used for step-up authentication flows
 */

/**
 * Generate a random code verifier for PKCE
 * The code verifier is a high-entropy cryptographic random string
 * using the unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 * with a minimum length of 43 characters and a maximum length of 128 characters.
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate a code challenge from a code verifier using S256 method
 * S256: BASE64URL(SHA256(code_verifier))
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode a Uint8Array
 * Uses the URL-safe alphabet and removes padding
 */
function base64UrlEncode(buffer: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  const base64 = btoa(binary);
  // Convert to base64url: replace + with -, / with _, and remove =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Store PKCE parameters in sessionStorage for the callback
 */
export interface PKCESession {
  codeVerifier: string;
  state: string;
  taskId?: string;
  contextId?: string;
  agentType: 'booking' | 'search';
  originalMessage?: string;
  agentUrl?: string;
  tokenEndpoint?: string;
  redirectUri?: string;
}

export function storePKCESession(session: PKCESession): void {
  sessionStorage.setItem('pkce_session', JSON.stringify(session));
}

export function getPKCESession(): PKCESession | null {
  const stored = sessionStorage.getItem('pkce_session');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearPKCESession(): void {
  sessionStorage.removeItem('pkce_session');
}

/**
 * Build the authorization URL for step-up authentication
 */
export async function buildAuthorizationUrl(
  authChallenge: {
    authorizationEndpoint: string;
    scopes: string[];
    redirectUri: string;
    responseType: string;
    clientId?: string;
  },
  codeVerifier: string,
  state: string
): Promise<string> {
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Get client_id from authChallenge or environment variable
  const clientId = authChallenge.clientId || process.env.NEXT_PUBLIC_AUTH0_STEPUP_CLIENT_ID;

  if (!clientId) {
    throw new Error('Auth0 client ID is not configured. Set NEXT_PUBLIC_AUTH0_STEPUP_CLIENT_ID in your environment.');
  }

  const params = new URLSearchParams({
    response_type: authChallenge.responseType || 'code',
    client_id: clientId,
    redirect_uri: authChallenge.redirectUri,
    scope: authChallenge.scopes.join(' '),
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${authChallenge.authorizationEndpoint}?${params.toString()}`;
}
