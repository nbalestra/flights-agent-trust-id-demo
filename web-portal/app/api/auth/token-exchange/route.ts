import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Default Auth0 configuration for step-up authentication
const DEFAULT_TOKEN_ENDPOINT = 'https://dev-hga0727m00203a17.us.auth0.com/oauth/token';
const AUTH0_CLIENT_ID = process.env.NEXT_PUBLIC_AUTH0_STEPUP_CLIENT_ID || '';
const DEFAULT_REDIRECT_URI = process.env.AUTH0_STEPUP_REDIRECT_URI || 'http://localhost:3000/callback';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      code,
      codeVerifier,
      taskId,
      contextId,
      agentType,
      originalMessage,
      agentUrl,
      tokenEndpoint,
      redirectUri,
    } = body;

    // Use provided endpoints or fall back to defaults
    const tokenUrl = tokenEndpoint || DEFAULT_TOKEN_ENDPOINT;
    const callbackUri = redirectUri || DEFAULT_REDIRECT_URI;

    if (!code || !codeVerifier) {
      return NextResponse.json(
        { error: 'Missing code or code verifier' },
        { status: 400 }
      );
    }

    console.log('[Token Exchange] Exchanging code for tokens...', {
      hasCode: !!code,
      codeLength: code?.length,
      hasCodeVerifier: !!codeVerifier,
      codeVerifierLength: codeVerifier?.length,
      taskId,
      agentType,
      tokenUrl,
      callbackUri,
      clientId: AUTH0_CLIENT_ID ? `${AUTH0_CLIENT_ID.substring(0, 8)}...` : 'NOT SET',
    });

    // Exchange the authorization code for tokens
    const tokenRequestBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUri,
      code_verifier: codeVerifier,
    });

    // Add client_id - required for Auth0
    if (AUTH0_CLIENT_ID) {
      tokenRequestBody.set('client_id', AUTH0_CLIENT_ID);
    } else {
      console.error('[Token Exchange] WARNING: No client_id configured!');
    }

    console.log('[Token Exchange] Token request params:', {
      grant_type: 'authorization_code',
      redirect_uri: callbackUri,
      code_verifier_length: codeVerifier?.length,
      client_id: AUTH0_CLIENT_ID ? 'SET' : 'NOT SET',
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Token Exchange] Token endpoint error:', tokenResponse.status, errorText);
      console.error('[Token Exchange] Request details for debugging:', {
        tokenUrl,
        redirect_uri: callbackUri,
        client_id: AUTH0_CLIENT_ID,
        code_length: code?.length,
        code_verifier_length: codeVerifier?.length,
      });

      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      // Provide helpful error message
      let errorMessage = errorData.error_description || errorData.error || 'Token exchange failed';
      if (errorData.error === 'invalid_grant') {
        errorMessage += '. This usually means: (1) the authorization code was already used, (2) redirect_uri mismatch, or (3) the code expired. Please try the authentication flow again.';
      }

      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: tokenResponse.status }
      );
    }

    const tokens = await tokenResponse.json();
    console.log('[Token Exchange] Tokens received:', {
      hasAccessToken: !!tokens.access_token,
      hasIdToken: !!tokens.id_token,
      tokenType: tokens.token_type,
      expiresIn: tokens.expires_in,
    });

    // Now resume the task with the step-up access token
    let agentResponse = null;
    let a2aRequest = null;

    if (agentUrl && taskId) {
      console.log('[Token Exchange] Resuming task with step-up token...', {
        agentUrl,
        taskId,
        contextId,
        hasOriginalAuthToken: !!session.accessToken,
      });

      // Create the A2A request to resume the task
      // Include the Auth0 step-up token in the message parts as auth_credentials
      const messageId = crypto.randomUUID();

      // Build parts array with text and auth_credentials data
      const parts = [
        {
          kind: 'text',
          text: originalMessage || 'Continue with the booking',
        },
        {
          kind: 'data',
          data: {
            auth_credentials: {
              accessToken: tokens.access_token,
            },
          },
        },
      ];

      // Build message object - include contextId and taskId only if they exist
      const message: Record<string, unknown> = {
        messageId,
        kind: 'message',
        role: 'user',
        parts,
        metadata: {},
      };

      if (contextId) {
        message.contextId = contextId;
      }
      if (taskId) {
        message.taskId = taskId;
      }

      a2aRequest = {
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method: 'message/send',
        params: {
          message,
          configuration: {
            blocking: true,
            acceptedOutputModes: ['text'],
          },
        },
      };

      console.log('[Token Exchange] A2A request:', JSON.stringify(a2aRequest, null, 2));

      try {
        // Build headers - preserve the original Authorization token (Keycloak)
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        // Use the original session access token (Keycloak) for Authorization header
        if (session.accessToken) {
          headers['Authorization'] = `Bearer ${session.accessToken}`;
          console.log('[Token Exchange] Using original Keycloak token in Authorization header');
        }

        console.log('[Token Exchange] Sending A2A request with step-up token in payload');

        const agentResp = await fetch(agentUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(a2aRequest),
        });

        if (agentResp.ok) {
          agentResponse = await agentResp.json();
          console.log('[Token Exchange] Agent response received:', {
            hasResult: !!agentResponse.result,
            state: agentResponse.result?.status?.state,
          });
        } else {
          console.error('[Token Exchange] Agent call failed:', agentResp.status);
          const errorText = await agentResp.text();
          console.error('[Token Exchange] Agent error:', errorText);
        }
      } catch (error) {
        console.error('[Token Exchange] Error calling agent:', error);
      }
    } else {
      console.log('[Token Exchange] Skipping A2A request - missing required params:', {
        hasAgentUrl: !!agentUrl,
        hasTaskId: !!taskId,
        agentUrl,
        taskId,
      });
    }

    console.log('[Token Exchange] Returning response with a2aRequest:', {
      hasA2aRequest: !!a2aRequest,
      a2aRequest: a2aRequest ? JSON.stringify(a2aRequest).substring(0, 200) : null,
    });

    return NextResponse.json({
      success: true,
      tokens: {
        accessToken: tokens.access_token,
        tokenType: tokens.token_type,
        expiresIn: tokens.expires_in,
        scope: tokens.scope,
      },
      agentResponse,
      a2aRequest,
      taskId,
      contextId,
    });

  } catch (error) {
    console.error('[Token Exchange] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
