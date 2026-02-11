'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getPKCESession, clearPKCESession } from '@/lib/pkce';
import { useDebug } from '@/contexts/DebugContext';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addLog } = useDebug();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Prevent double-processing (React strict mode, refreshes, etc.)
  const processingRef = useRef(false);

  useEffect(() => {
    // Get the code from URL to use as a unique identifier for this callback
    const code = searchParams.get('code');
    const processedKey = `callback_processed_${code?.substring(0, 20)}`;

    // Check if we've already processed this specific code
    if (sessionStorage.getItem(processedKey)) {
      console.log('[Callback] This code was already processed, skipping...');
      return;
    }

    // Check synchronously before starting async work
    if (processingRef.current) {
      console.log('[Callback] Already processing, skipping...');
      return;
    }
    processingRef.current = true;

    // Mark this code as being processed
    sessionStorage.setItem(processedKey, 'processing');

    const handleCallback = async () => {

      try {
        // Get the authorization code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        console.log('[Callback] Received callback:', { code: !!code, state, error });

        // Check for OAuth errors
        if (error) {
          console.error('[Callback] OAuth error:', error, errorDescription);
          addLog({
            action: 'Step-up authentication failed',
            type: 'error',
            details: {
              error,
              errorDescription,
            },
          });
          setErrorMessage(errorDescription || error);
          setStatus('error');
          return;
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        // Get the stored PKCE session
        const pkceSession = getPKCESession();
        if (!pkceSession) {
          throw new Error('No PKCE session found. Please try again.');
        }

        // Verify state matches
        if (state !== pkceSession.state) {
          throw new Error('State mismatch. Possible CSRF attack.');
        }

        console.log('[Callback] PKCE session found:', {
          taskId: pkceSession.taskId,
          contextId: pkceSession.contextId,
          agentType: pkceSession.agentType,
          redirectUri: pkceSession.redirectUri,
          tokenEndpoint: pkceSession.tokenEndpoint,
          codeVerifierLength: pkceSession.codeVerifier?.length,
        });

        // Clear the PKCE session immediately to prevent re-use
        clearPKCESession();

        addLog({
          action: 'Authorization code received',
          type: 'info',
          details: {
            hasCode: true,
            stateValid: true,
            taskId: pkceSession.taskId,
            agentType: pkceSession.agentType,
            redirectUri: pkceSession.redirectUri,
          },
        });

        // Exchange the code for tokens via our API
        const tokenResponse = await fetch('/api/auth/token-exchange', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            codeVerifier: pkceSession.codeVerifier,
            taskId: pkceSession.taskId,
            contextId: pkceSession.contextId,
            agentType: pkceSession.agentType,
            originalMessage: pkceSession.originalMessage,
            agentUrl: pkceSession.agentUrl,
            tokenEndpoint: pkceSession.tokenEndpoint,
            redirectUri: pkceSession.redirectUri,
          }),
        });

        console.log('[Callback] Token response status:', tokenResponse.status, tokenResponse.ok);

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('[Callback] Token exchange failed:', errorData);
          throw new Error(errorData.error || 'Token exchange failed');
        }

        const tokenData = await tokenResponse.json();
        console.log('[Callback] Full tokenData received:', JSON.stringify(tokenData, null, 2));

        console.log('[Callback] Token exchange successful', {
          hasA2aRequest: !!tokenData.a2aRequest,
          hasAgentResponse: !!tokenData.agentResponse,
          a2aRequest: tokenData.a2aRequest,
        });

        addLog({
          action: 'Step-up authentication successful',
          type: 'info',
          details: {
            provider: 'Auth0',
            taskResumed: true,
            taskId: pkceSession.taskId,
          },
        });

        // Store the result in sessionStorage for the chat page to pick up
        const stepupResult = {
          success: true,
          taskId: pkceSession.taskId,
          contextId: pkceSession.contextId,
          agentType: pkceSession.agentType,
          originalMessage: pkceSession.originalMessage,
          agentResponse: tokenData.agentResponse,
          a2aRequest: tokenData.a2aRequest,
          // Include the Auth0 step-up tokens for subsequent requests
          stepUpTokens: tokenData.tokens,
        };
        console.log('[Callback] Storing stepup_auth_result in sessionStorage:', stepupResult);
        sessionStorage.setItem('stepup_auth_result', JSON.stringify(stepupResult));

        // Verify it was stored
        const verifyStored = sessionStorage.getItem('stepup_auth_result');
        console.log('[Callback] Verified stepup_auth_result stored:', verifyStored ? 'YES' : 'NO');

        setStatus('success');

        // Mark as successfully processed in sessionStorage
        sessionStorage.setItem(processedKey, 'completed');

        // Redirect back to chat after a short delay
        setTimeout(() => {
          console.log('[Callback] About to redirect to /chat, checking sessionStorage...');
          console.log('[Callback] stepup_auth_result before redirect:', sessionStorage.getItem('stepup_auth_result') ? 'EXISTS' : 'NOT FOUND');
          router.push('/chat');
        }, 1500);

      } catch (error) {
        console.error('[Callback] Error:', error);
        addLog({
          action: 'Step-up authentication error',
          type: 'error',
          details: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
        setStatus('error');
      } finally {
        processingRef.current = false;
      }
    };

    handleCallback();
  }, [searchParams, router, addLog]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4">
        {status === 'processing' && (
          <div className="text-center space-y-4">
            <Loader2 className="w-16 h-16 text-easyjet-orange animate-spin mx-auto" />
            <h2 className="text-xl font-semibold text-gray-800">
              Completing Authentication
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your authorization...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-800">
              Authentication Successful
            </h2>
            <p className="text-gray-600">
              Redirecting you back to the chat...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-xl font-semibold text-gray-800">
              Authentication Failed
            </h2>
            <p className="text-gray-600">
              {errorMessage || 'An error occurred during authentication.'}
            </p>
            <button
              onClick={() => router.push('/chat')}
              className="mt-4 px-6 py-2 bg-easyjet-orange text-white rounded-lg hover:bg-easyjet-orange-dark transition-colors"
            >
              Return to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
