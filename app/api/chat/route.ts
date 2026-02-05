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
    const { message, conversationId, context } = body;

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
    const response = await a2aClient.sendMessage(
      {
        message,
        conversationId,
        context: {
          ...context,
          userId: session.user?.email,
          userName: session.user?.name,
          detectedIntent,
        },
      },
      agentType
    );

    return NextResponse.json({
      success: true,
      data: {
        ...response,
        intent: detectedIntent,
        agentType,
        intentDetectionError,
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
