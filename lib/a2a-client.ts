import { v4 as uuidv4 } from 'uuid';
import type { A2AMessage, A2ARequest, A2AResponse } from '@/types';

export type AgentType = 'booking' | 'search';

/**
 * A2A Agent Client
 * Handles communication with the A2A agents (booking and search) using the A2A protocol
 */
export class A2AClient {
  private bookingAgentUrl: string;
  private searchAgentUrl: string;
  private conversationId: string | null = null;

  constructor() {
    this.bookingAgentUrl = process.env.A2A_BOOKING_AGENT_URL || '';
    this.searchAgentUrl = process.env.A2A_SEARCH_AGENT_URL || '';
  }

  /**
   * Create an A2A message payload
   */
  private createA2AMessage(
    content: string,
    type: 'request' | 'response' | 'error' = 'request',
    metadata?: Record<string, any>
  ): A2AMessage {
    return {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      payload: {
        content,
        data: metadata?.data,
      },
      metadata: {
        conversationId: this.conversationId || uuidv4(),
        ...metadata,
      },
    };
  }

  /**
   * Send a message to the appropriate A2A agent based on type
   */
  async sendMessage(request: A2ARequest, agentType: AgentType = 'search'): Promise<A2AResponse> {
    const agentUrl = agentType === 'booking' ? this.bookingAgentUrl : this.searchAgentUrl;
    try {
      // Update conversation ID if provided
      if (request.conversationId) {
        this.conversationId = request.conversationId;
      } else if (!this.conversationId) {
        this.conversationId = uuidv4();
      }

      // Create A2A message
      const a2aMessage = this.createA2AMessage(
        request.message,
        'request',
        {
          data: {
            ...request.context,
            agentType, // Include agent type in context
          },
        }
      );

      console.log(`[A2A] Sending to ${agentType} agent:`, {
        conversationId: this.conversationId,
        agentUrl,
      });

      // If agent URL is not configured, use mock response
      if (!agentUrl) {
        console.warn(`[A2A] ${agentType} agent URL not configured, using mock response`);
        const response: A2AResponse = {
          message: this.getMockResponse(request.message, agentType),
          conversationId: this.conversationId,
          data: {
            agentType,
            messageId: a2aMessage.id,
            mock: true,
          },
        };
        return response;
      }

      // Call the real A2A agent
      try {
        const response = await fetch(agentUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(a2aMessage),
        });

        if (!response.ok) {
          throw new Error(`A2A request failed: ${response.statusText}`);
        }

        const responseData: A2AMessage = await response.json();
        
        return {
          message: responseData.payload.content || '',
          conversationId: responseData.metadata?.conversationId || this.conversationId,
          data: responseData.payload.data,
        };
      } catch (error) {
        console.error(`[A2A] Error calling ${agentType} agent:`, error);
        // Fallback to mock response on error
        return {
          message: this.getMockResponse(request.message, agentType),
          conversationId: this.conversationId,
          data: {
            agentType,
            error: error instanceof Error ? error.message : 'Unknown error',
            mock: true,
          },
        };
      }
    } catch (error) {
      console.error('A2A communication error:', error);
      throw new Error(`Failed to communicate with agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mock response generator (used when agents are not configured)
   */
  private getMockResponse(userMessage: string, agentType: AgentType): string {
    const lowerMessage = userMessage.toLowerCase();
    
    if (agentType === 'booking') {
      return `🎫 **Booking Assistant** (Mock)\n\nI detected you want to book a flight! Once the booking agent is configured, I'll help you:\n- Select your flight\n- Choose seats\n- Add extras\n- Complete payment\n\nFor now, this is a mock response. The real booking agent will be connected soon!`;
    }
    
    if (agentType === 'search') {
      if (lowerMessage.includes('paris')) {
        return `✈️ **Flight Search** (Mock)\n\nSearching for flights to Paris...\n\nFound 5 available flights:\n1. 08:00 - €150\n2. 10:30 - €175\n3. 14:00 - €165\n4. 16:45 - €155\n5. 19:30 - €145\n\nOnce the search agent is configured, you'll get real-time availability!`;
      }
      
      if (lowerMessage.includes('flight') || lowerMessage.includes('search')) {
        return `✈️ **Flight Search** (Mock)\n\nI can help you search for flights! Please provide:\n- Departure city\n- Destination\n- Travel dates\n- Number of passengers\n\nOnce the search agent is configured, you'll get real results!`;
      }
    }
    
    return `Hello! Welcome to EasyJetlag. I'm your AI assistant. Based on your message, I'm routing you to the **${agentType}** service.\n\nNote: This is a mock response. Configure the ${agentType} agent URL in .env.local for real functionality.`;
  }

  /**
   * Reset conversation
   */
  resetConversation(): void {
    this.conversationId = null;
  }

  /**
   * Get current conversation ID
   */
  getConversationId(): string | null {
    return this.conversationId;
  }
}

// Singleton instance
let a2aClient: A2AClient | null = null;

export function getA2AClient(): A2AClient {
  if (!a2aClient) {
    a2aClient = new A2AClient();
  }
  return a2aClient;
}
