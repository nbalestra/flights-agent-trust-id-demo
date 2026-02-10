import { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';
import { JWT } from 'next-auth/jwt';

// Helper to extract expiration from JWT token
function getTokenExpiration(token: string | undefined): number | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Helper to decode JWT payload
function decodeJWTPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch {
    return null;
  }
}

// Authorization constants
const REQUIRED_AUDIENCE = 'easyjetlag-app';

// Check if the access token audience contains the required client
function hasRequiredAudience(accessToken: string | undefined): boolean {
  if (!accessToken) {
    console.log('[NextAuth] No access token to check audience');
    return false;
  }

  const payload = decodeJWTPayload(accessToken);
  if (!payload) {
    console.log('[NextAuth] Could not decode access token');
    return false;
  }

  const aud = payload.aud;

  // Audience can be a string or an array of strings
  let audiences: string[] = [];
  if (typeof aud === 'string') {
    audiences = [aud];
  } else if (Array.isArray(aud)) {
    audiences = aud as string[];
  }

  const hasAudience = audiences.includes(REQUIRED_AUDIENCE);

  console.log(`[NextAuth] Audience check for '${REQUIRED_AUDIENCE}':`, {
    hasAudience,
    tokenAudiences: audiences,
  });

  return hasAudience;
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const issuer = process.env.KEYCLOAK_ISSUER;
    const tokenEndpoint = `${issuer}/protocol/openid-connect/token`;

    console.log('[NextAuth] Refreshing access token...');

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_CLIENT_ID || '',
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error('[NextAuth] Token refresh failed:', refreshedTokens);
      throw refreshedTokens;
    }

    console.log('[NextAuth] Token refreshed successfully');

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      idToken: refreshedTokens.id_token ?? token.idToken,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
    };
  } catch (error) {
    console.error('[NextAuth] Error refreshing access token:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID || '',
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '', // Empty for public clients
      issuer: process.env.KEYCLOAK_ISSUER,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
      // Support for public clients (no client secret required)
      checks: process.env.KEYCLOAK_CLIENT_SECRET ? ['pkce', 'state'] : ['pkce'],
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Check if the access token audience contains the required client
      if (account?.access_token) {
        const authorized = hasRequiredAudience(account.access_token);
        if (!authorized) {
          console.log('[NextAuth] User denied access - token audience does not contain required client');
          // Redirect to error page with AccessDenied error
          return '/auth/error?error=AccessDenied';
        }
      }
      return true;
    },
    async jwt({ token, account }) {
      // Initial sign in - persist tokens from the OAuth provider
      if (account) {
        // Calculate token expiration - prefer expires_at, fallback to JWT exp claim, then default
        const tokenExp = getTokenExpiration(account.access_token);
        const expiresAt = account.expires_at
          ? account.expires_at * 1000
          : tokenExp
          ? tokenExp
          : Date.now() + 300 * 1000;

        console.log('[NextAuth JWT] Initial sign-in, account received:', {
          hasAccessToken: !!account.access_token,
          hasIdToken: !!account.id_token,
          hasRefreshToken: !!account.refresh_token,
          accessTokenLength: account.access_token?.length,
          expiresAt: new Date(expiresAt).toISOString(),
          accountExpiresAt: account.expires_at,
          tokenExpFromJWT: tokenExp ? new Date(tokenExp).toISOString() : null,
        });

        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: expiresAt,
        };
      }

      // Return previous token if the access token has not expired yet
      const accessTokenExpires = token.accessTokenExpires as number;
      if (Date.now() < accessTokenExpires - 60 * 1000) { // Refresh 60 seconds before expiry
        console.log('[NextAuth JWT] Token still valid, expires at:', new Date(accessTokenExpires).toISOString());
        return token;
      }

      // Access token has expired, try to refresh it
      console.log('[NextAuth JWT] Token expired, attempting refresh...');
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      console.log('[NextAuth Session] Creating session with token:', {
        hasAccessToken: !!token.accessToken,
        hasIdToken: !!token.idToken,
        hasRefreshToken: !!token.refreshToken,
        hasError: !!token.error,
      });

      // Send properties to the client
      if (token) {
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string;
        session.refreshToken = token.refreshToken as string;
        // Expose token refresh error to client so it can trigger re-authentication
        if (token.error) {
          session.error = token.error as string;
        }
      }

      console.log('[NextAuth Session] Session created:', {
        hasAccessToken: !!session.accessToken,
        hasIdToken: !!(session as any).idToken,
        hasUser: !!session.user,
        hasError: !!(session as any).error,
      });

      return session;
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log('[NextAuth Event] signIn:', {
        userId: user?.id,
        userEmail: user?.email,
        provider: account?.provider,
        hasAccessToken: !!account?.access_token,
        hasIdToken: !!account?.id_token,
        hasRefreshToken: !!account?.refresh_token,
      });
    },
    async session({ session, token }) {
      console.log('[NextAuth Event] session:', {
        userEmail: session?.user?.email,
        hasAccessToken: !!(token as any)?.accessToken,
      });
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
};
