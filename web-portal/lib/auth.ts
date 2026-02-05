import { NextAuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

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
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        console.log('[NextAuth JWT] Account received:', {
          hasAccessToken: !!account.access_token,
          hasIdToken: !!account.id_token,
          hasRefreshToken: !!account.refresh_token,
          accessTokenLength: account.access_token?.length,
        });
        
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
        token.refreshToken = account.refresh_token;
      }
      
      console.log('[NextAuth JWT] Token state:', {
        hasAccessToken: !!token.accessToken,
        hasIdToken: !!token.idToken,
        hasRefreshToken: !!token.refreshToken,
      });
      
      return token;
    },
    async session({ session, token }) {
      console.log('[NextAuth Session] Creating session with token:', {
        hasAccessToken: !!token.accessToken,
        hasIdToken: !!token.idToken,
        hasRefreshToken: !!token.refreshToken,
      });
      
      // Send properties to the client
      if (token) {
        session.accessToken = token.accessToken as string;
        session.idToken = token.idToken as string;
        session.refreshToken = token.refreshToken as string;
      }
      
      console.log('[NextAuth Session] Session created:', {
        hasAccessToken: !!session.accessToken,
        hasIdToken: !!(session as any).idToken,
        hasUser: !!session.user,
      });
      
      return session;
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
  secret: process.env.NEXTAUTH_SECRET,
};
