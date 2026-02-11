import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getA2AClient, type AgentType } from '@/lib/a2a-client';
import { getBedrockClient } from '@/lib/bedrock-client';

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

    // Parse request body
    const body = await request.json();
    const { message, conversationId, context, flightSearchResults, stepUpAccessToken } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message format' },
        { status: 400 }
      );
    }

    // Step 1: Detect intent using Bedrock agent
    const bedrockClient = getBedrockClient();
    
    let detectedIntent: 'SEARCHING' | 'BOOKING' = 'SEARCHING';
    let intentDetectionError: string | null = null;

    if (bedrockClient.isConfigured()) {
      try {
        console.log('[Chat API] Detecting intent with Bedrock...');
        
        const intentResponse = await bedrockClient.detectIntent({
          inputText: message,
          sessionId: conversationId || `session-${Date.now()}`,
          enableTrace: false,
        });

        detectedIntent = intentResponse.intent;
        
        console.log('[Chat API] Intent detected:', detectedIntent);
      } catch (error) {
        console.error('[Chat API] Intent detection error:', error);
        intentDetectionError = error instanceof Error ? error.message : 'Unknown error';
        // Continue with default intent (SEARCHING)
      }
    } else {
      console.warn('[Chat API] Bedrock not configured, defaulting to SEARCHING');
    }

    // Step 2: Route to appropriate A2A agent based on intent
    const agentType: AgentType = detectedIntent === 'BOOKING' ? 'booking' : 'search';
    
    console.log('[Chat API] Routing to agent:', agentType);

    const a2aClient = getA2AClient();

    // For booking requests, include flight search results as context
    let enrichedMessage = message;
    if (agentType === 'booking') {
      console.log('[Chat API] Booking request - flightSearchResults present:', !!flightSearchResults);
      if (flightSearchResults) {
        console.log('[Chat API] Including flight search results in booking request');
        console.log('[Chat API] Search results length:', flightSearchResults.length);
        enrichedMessage = `${message}\n\n--- Available Flight Details from Search ---\n${flightSearchResults}`;
        console.log('[Chat API] Enriched message:', enrichedMessage.substring(0, 200) + '...');
      } else {
        console.warn('[Chat API] No flight search results available for booking request');
      }
    }

    // Include step-up token for booking requests if available
    const includeStepUpToken = agentType === 'booking' && stepUpAccessToken;
    if (includeStepUpToken) {
      console.log('[Chat API] Including step-up access token for booking agent');
    }

    const response = await a2aClient.sendMessage(
      {
        message: enrichedMessage,
        conversationId,
        context: {
          ...context,
          userId: session.user?.email,
          userName: session.user?.name,
          detectedIntent,
          ...(flightSearchResults && { flightSearchResults }),
        },
        accessToken: session.accessToken,
        // Include step-up token for booking requests
        ...(includeStepUpToken && { stepUpAccessToken }),
      },
      agentType
    );

    // Extract A2A specific data
    const a2aState = response.data?.state;
    const needsInput = response.data?.needsInput;
    const needsAuth = response.data?.needsAuth;
    const isMock = response.data?.mock;
    const taskId = response.data?.taskId;
    const contextId = response.data?.contextId;
    const agentUrl = response.data?.agentUrl;

    // If a new auth challenge is received, the client should clear any existing step-up token
    const clearStepUpToken = needsAuth && response.authChallenge;
    if (clearStepUpToken) {
      console.log('[Chat API] New auth challenge received, client should clear step-up token');
    }

    return NextResponse.json({
      success: true,
      data: {
        ...response,
        intent: detectedIntent,
        agentType,
        intentDetectionError,
        a2aState,
        needsInput,
        needsAuth,
        isMock,
        taskId,
        contextId,
        agentUrl,
        // Include auth challenge if step-up authentication is required
        authChallenge: response.authChallenge,
        // Signal to clear existing step-up token when new auth challenge is received
        clearStepUpToken,
        // Include raw A2A payloads for debugging
        a2aRequest: response.rawRequest,
        a2aResponse: response.rawResponse,
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
