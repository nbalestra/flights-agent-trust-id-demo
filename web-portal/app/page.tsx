'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Loader2 } from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';
import { decodeJWT, formatJWTPayload } from '@/lib/jwt-utils';
import { DebugPane } from '@/components/DebugPane';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addLog } = useDebug();

  useEffect(() => {
    if (session) {
      console.log('[Login] Session received:', {
        hasAccessToken: !!session.accessToken,
        accessTokenLength: session.accessToken?.length,
        sessionKeys: Object.keys(session),
      });

      // Decode access token if available
      let tokenPayload = null;
      let formattedToken = null;
      
      if (session.accessToken) {
        console.log('[Login] Decoding access token...');
        tokenPayload = decodeJWT(session.accessToken);
        console.log('[Login] Token payload:', tokenPayload);
        
        if (tokenPayload) {
          formattedToken = formatJWTPayload(tokenPayload);
          console.log('[Login] Formatted token:', formattedToken);
        }
      } else {
        console.warn('[Login] No access token in session!');
        console.log('[Login] Full session object:', session);
      }

      const logDetails: any = {
        user: {
          name: session.user?.name || undefined,
          email: session.user?.email || undefined,
        },
        provider: 'Keycloak',
        sessionInfo: {
          hasAccessToken: !!session.accessToken,
          hasIdToken: !!(session as any).idToken,
          hasRefreshToken: !!(session as any).refreshToken,
        },
        rawSession: JSON.stringify(session, null, 2),
      };

      // Add access token info if available
      if (session.accessToken) {
        logDetails.accessToken = {
          raw: session.accessToken,
          decoded: formattedToken,
          issuedAt: formattedToken?.iat_readable || 'Unknown',
          expiresAt: formattedToken?.exp_readable || 'Unknown',
          subject: tokenPayload?.sub,
          issuer: tokenPayload?.iss,
          audience: tokenPayload?.aud,
          scopes: tokenPayload?.scope,
        };
      } else {
        logDetails.accessTokenStatus = 'No access token available in session - Check NextAuth configuration';
      }

      addLog({
        action: 'User logged in successfully',
        type: 'login',
        details: logDetails,
      });
      router.push('/chat');
    }
  }, [session, router, addLog]);

  const handleLogin = () => {
    console.log('[Login] User clicked login button');
    
    addLog({
      action: 'User initiated login',
      type: 'login',
      details: {
        provider: 'Keycloak',
        redirectUrl: '/chat',
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log('[Login] Log added, redirecting to Keycloak...');
    signIn('keycloak', { callbackUrl: '/chat' });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DebugPane />
      <main className="min-h-screen bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Logo and Brand */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-white rounded-full p-6 shadow-2xl">
              <Plane className="w-16 h-16 text-easyjet-orange transform -rotate-45" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">
            EasyJetlag
          </h1>
          <p className="text-xl text-white/90">
            Your AI Travel Companion
          </p>
        </div>

        {/* Login Card */}
        <div className="card space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-easyjet-gray">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to access your travel assistant
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full btn-primary text-lg py-4"
          >
            Sign In with Keycloak
          </button>

          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              Secure authentication powered by Keycloak
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="text-center text-white/80 text-sm space-y-2">
          <p>✈️ Book flights instantly</p>
          <p>💬 24/7 AI assistance</p>
          <p>🎫 Manage bookings easily</p>
        </div>
        </div>
      </main>
    </>
  );
}
