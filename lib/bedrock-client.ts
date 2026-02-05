/**
 * AWS Bedrock Agent Client
 * Handles communication with the Bedrock Intent Detection Agent
 * 
 * Uses AWS SDK v3 with IAM credentials (Access Key ID + Secret Access Key).
 */

import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

export interface BedrockAgentRequest {
  inputText: string;
  sessionId: string;
  enableTrace?: boolean;
}

export interface BedrockAgentResponse {
  completion: string;
  intent: 'SEARCHING' | 'BOOKING';
  sessionId: string;
  rawResponse?: any;
}

export class BedrockClient {
  private client: BedrockAgentRuntimeClient;
  private agentId: string;
  private aliasId: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-2';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || '';
    
    this.agentId = process.env.BEDROCK_INTENT_AGENT_ID || '';
    this.aliasId = process.env.BEDROCK_INTENT_ALIAS_ID || '';

    // Initialize AWS SDK client with IAM credentials
    this.client = new BedrockAgentRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    if (!accessKeyId || !secretAccessKey || !this.agentId || !this.aliasId) {
      console.warn('[Bedrock] Credentials not fully configured');
    }

    console.log('[Bedrock] Client initialized:', {
      region,
      agentId: this.agentId,
      aliasId: this.aliasId,
      credentialsConfigured: !!(accessKeyId && secretAccessKey),
    });
  }

  /**
   * Detect user intent using the Bedrock agent
   * Returns SEARCHING or BOOKING
   */
  async detectIntent(request: BedrockAgentRequest): Promise<BedrockAgentResponse> {
    try {
      console.log('[Bedrock] Invoking agent:', {
        agentId: this.agentId,
        agentAliasId: this.aliasId,
        sessionId: request.sessionId,
        inputText: request.inputText,
      });

      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.aliasId,
        sessionId: request.sessionId,
        inputText: request.inputText,
        enableTrace: request.enableTrace ?? false,
      });

      const response = await this.client.send(command);

      console.log('[Bedrock] Agent invoked successfully');

      // Process the streaming response
      let completion = '';
      
      if (response.completion) {
        for await (const event of response.completion) {
          if (event.chunk?.bytes) {
            const chunkText = new TextDecoder().decode(event.chunk.bytes);
            completion += chunkText;
            console.log('[Bedrock] Chunk received:', chunkText);
          }
        }
      }

      console.log('[Bedrock] Full completion:', completion);

      // Parse the completion text - should be either "SEARCHING" or "BOOKING"
      const completionText = completion.trim().toUpperCase();
      
      // Determine intent from response
      let intent: 'SEARCHING' | 'BOOKING' = 'SEARCHING'; // Default to SEARCHING
      
      if (completionText.includes('BOOKING')) {
        intent = 'BOOKING';
      } else if (completionText.includes('SEARCHING')) {
        intent = 'SEARCHING';
      } else {
        // If response doesn't match expected format, try to parse it
        console.warn('[Bedrock] Unexpected completion format:', completionText);
        // Default to SEARCHING if ambiguous
        intent = 'SEARCHING';
      }

      console.log('[Bedrock] Detected intent:', intent);

      return {
        completion: completion.trim(),
        intent,
        sessionId: request.sessionId,
        rawResponse: response,
      };
    } catch (error) {
      console.error('[Bedrock] Error detecting intent:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('[Bedrock] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
      
      throw new Error(
        `Failed to detect intent: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if Bedrock client is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      this.agentId &&
      this.aliasId
    );
  }
}

// Singleton instance
let bedrockClient: BedrockClient | null = null;

export function getBedrockClient(): BedrockClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockClient();
  }
  return bedrockClient;
}
