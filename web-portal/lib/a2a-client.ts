import { v4 as uuidv4 } from 'uuid';
import type {
  A2ARequest,
  A2AResponse,
  A2AJsonRpcRequest,
  A2AJsonRpcResponse,
  A2AMessagePart,
  A2ATask,
  A2AArtifact
} from '@/types';

export type AgentType = 'booking' | 'search';

// Agent configuration with URLs
interface AgentConfig {
  url: string;
  name: string;
  description: string;
}

// Registry of available sub-agents
const AGENT_REGISTRY: Record<AgentType, AgentConfig> = {
  search: {
    url: process.env.A2A_SEARCH_AGENT_URL || 'https://broker-group-egress-gw-jouxsp.fgjt7.usa-e1.cloudhub.io/flight-search-agent/',
    name: 'Flight Search Agent',
    description: 'AI-powered flight search agent'
  },
  booking: {
    url: process.env.A2A_BOOKING_AGENT_URL || '',
    name: 'Flight Booking Agent',
    description: 'Flight booking and reservation agent'
  }
};

/**
 * A2A Protocol Client
 * Implements the Google A2A protocol (JSON-RPC format) for agent-to-agent communication
 */
export class A2AClient {
  private contextId: string | null = null;
  private taskIds: Map<AgentType, string> = new Map();

  constructor() {
    // Initialize with no context - will be created on first message
  }

  /**
   * Get the URL for a specific agent type
   */
  private getAgentUrl(agentType: AgentType): string {
    return AGENT_REGISTRY[agentType]?.url || '';
  }

  /**
   * Create an A2A JSON-RPC request
   */
  private createA2ARequest(
    message: string,
    contextId?: string,
    taskId?: string
  ): A2AJsonRpcRequest {
    const messageId = uuidv4();

    const parts: A2AMessagePart[] = [
      {
        kind: 'text',
        text: message
      }
    ];

    const request: A2AJsonRpcRequest = {
      jsonrpc: '2.0',
      id: uuidv4(),
      method: 'message/send',
      params: {
        message: {
          messageId,
          role: 'user',
          parts,
          ...(contextId && { contextId }),
          ...(taskId && { taskId })
        },
        configuration: {
          blocking: true,
          acceptedOutputModes: ['text']
        }
      }
    };

    return request;
  }

  /**
   * Extract text content from A2A response artifacts or status message
   */
  private extractResponseText(task: A2ATask): string {
    // First, check for artifacts (completed tasks)
    if (task.artifacts && task.artifacts.length > 0) {
      const textParts: string[] = [];

      for (const artifact of task.artifacts) {
        for (const part of artifact.parts) {
          if (part.kind === 'text' && part.text) {
            textParts.push(part.text);
          }
        }
      }

      if (textParts.length > 0) {
        return textParts.join('\n');
      }
    }

    // Then, check status message (for input_required or other states)
    if (task.status?.message?.parts) {
      const textParts: string[] = [];

      for (const part of task.status.message.parts) {
        if (part.kind === 'text' && part.text) {
          textParts.push(part.text);
        }
      }

      if (textParts.length > 0) {
        return textParts.join('\n');
      }
    }

    return '';
  }

  /**
   * Parse A2A JSON-RPC response
   */
  private parseA2AResponse(
    response: A2AJsonRpcResponse,
    agentType: AgentType
  ): A2AResponse {
    // Handle JSON-RPC error
    if (response.error) {
      console.error('[A2A] JSON-RPC error:', response.error);
      return {
        message: `Error from ${agentType} agent: ${response.error.message}`,
        conversationId: this.contextId || uuidv4(),
        error: response.error.message,
        data: {
          agentType,
          errorCode: response.error.code,
          errorDetails: response.error.data
        }
      };
    }

    // Extract task from result - handle both formats
    const task = response.result?.task || (response.result as unknown as A2ATask);

    if (!task) {
      console.error('[A2A] No task in response:', response);
      return {
        message: 'No response received from agent',
        conversationId: this.contextId || uuidv4(),
        error: 'Empty response',
        data: { agentType }
      };
    }

    // Update context and task IDs
    if (task.contextId) {
      this.contextId = task.contextId;
    }
    if (task.id) {
      this.taskIds.set(agentType, task.id);
    }

    // Extract response text
    const responseText = this.extractResponseText(task);

    // Determine state
    const state = task.status?.state || 'unknown';
    const isError = state === 'failed';
    const needsInput = state === 'input_required';

    return {
      message: responseText || `Agent state: ${state}`,
      conversationId: this.contextId || uuidv4(),
      data: {
        agentType,
        taskId: task.id,
        contextId: task.contextId,
        state,
        needsInput,
        artifacts: task.artifacts
      },
      ...(isError && { error: responseText || 'Agent execution failed' })
    };
  }

  /**
   * Send a message to the appropriate A2A agent based on type
   */
  async sendMessage(request: A2ARequest, agentType: AgentType = 'search'): Promise<A2AResponse> {
    const agentUrl = this.getAgentUrl(agentType);

    try {
      // Update context ID if provided
      if (request.conversationId) {
        this.contextId = request.conversationId;
      }

      // Create A2A JSON-RPC request
      const existingTaskId = this.taskIds.get(agentType);
      const a2aRequest = this.createA2ARequest(
        request.message,
        this.contextId || undefined,
        existingTaskId
      );

      console.log(`[A2A] Sending to ${agentType} agent:`, {
        contextId: this.contextId,
        taskId: existingTaskId,
        agentUrl,
        method: a2aRequest.method
      });

      // If agent URL is not configured, use mock response
      if (!agentUrl) {
        console.warn(`[A2A] ${agentType} agent URL not configured, using mock response`);
        return this.getMockResponse(request.message, agentType);
      }

      // Call the A2A agent
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };

        // Add Authorization header if access token is provided
        if (request.accessToken) {
          headers['Authorization'] = `Bearer ${request.accessToken}`;
          console.log('[A2A] Including access token in request');
        }

        const response = await fetch(agentUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(a2aRequest)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[A2A] HTTP error from ${agentType} agent:`, response.status, errorText);
          throw new Error(`A2A request failed: ${response.status} ${response.statusText}`);
        }

        const responseData: A2AJsonRpcResponse = await response.json();
        console.log(`[A2A] Response from ${agentType} agent:`, JSON.stringify(responseData, null, 2));

        // Check if we got a "task not found" error and retry without the task ID
        if (responseData.error?.message?.includes('was specified but does not exist') && existingTaskId) {
          console.warn(`[A2A] Task ${existingTaskId} no longer exists on server, clearing cache and retrying`);
          this.taskIds.delete(agentType);

          // Create new request without task ID
          const retryRequest = this.createA2ARequest(
            request.message,
            this.contextId || undefined,
            undefined  // No task ID this time
          );

          const retryResponse = await fetch(agentUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(retryRequest)
          });

          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            console.error(`[A2A] HTTP error on retry from ${agentType} agent:`, retryResponse.status, errorText);
            throw new Error(`A2A retry request failed: ${retryResponse.status} ${retryResponse.statusText}`);
          }

          const retryData: A2AJsonRpcResponse = await retryResponse.json();
          console.log(`[A2A] Retry response from ${agentType} agent:`, JSON.stringify(retryData, null, 2));
          return this.parseA2AResponse(retryData, agentType);
        }

        return this.parseA2AResponse(responseData, agentType);

      } catch (error) {
        console.error(`[A2A] Error calling ${agentType} agent:`, error);

        // If network error, fall back to mock
        if (error instanceof TypeError && error.message.includes('fetch')) {
          console.warn(`[A2A] Network error, using mock response`);
          return this.getMockResponse(request.message, agentType);
        }

        // Return error response
        return {
          message: `Failed to communicate with ${agentType} agent: ${error instanceof Error ? error.message : 'Unknown error'}`,
          conversationId: this.contextId || uuidv4(),
          error: error instanceof Error ? error.message : 'Unknown error',
          data: {
            agentType,
            mock: false
          }
        };
      }
    } catch (error) {
      console.error('A2A communication error:', error);
      throw new Error(`Failed to communicate with agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get agent card/capabilities from an A2A agent
   */
  async getAgentCard(agentType: AgentType): Promise<Record<string, unknown> | null> {
    const agentUrl = this.getAgentUrl(agentType);

    if (!agentUrl) {
      console.warn(`[A2A] ${agentType} agent URL not configured`);
      return null;
    }

    try {
      // Agent card is typically at /.well-known/agent.json relative to the base URL
      const baseUrl = agentUrl.replace('/agent', '');
      const agentCardUrl = `${baseUrl}/.well-known/agent.json`;

      const response = await fetch(agentCardUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`[A2A] Failed to get agent card: ${response.status}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`[A2A] Error getting agent card:`, error);
      return null;
    }
  }

  /**
   * Mock response generator (used when agents are not configured)
   */
  private getMockResponse(userMessage: string, agentType: AgentType): A2AResponse {
    const lowerMessage = userMessage.toLowerCase();
    const conversationId = this.contextId || uuidv4();

    if (!this.contextId) {
      this.contextId = conversationId;
    }

    let message: string;

    if (agentType === 'booking') {
      message = `**Booking Assistant** (Mock)\n\nI detected you want to book a flight! Once the booking agent is configured, I'll help you:\n- Select your flight\n- Choose seats\n- Add extras\n- Complete payment\n\nFor now, this is a mock response. The real booking agent will be connected soon!`;
    } else if (agentType === 'search') {
      if (lowerMessage.includes('paris')) {
        message = `**Flight Search** (Mock)\n\nSearching for flights to Paris...\n\nFound 5 available flights:\n1. 08:00 - €150\n2. 10:30 - €175\n3. 14:00 - €165\n4. 16:45 - €155\n5. 19:30 - €145\n\nOnce the search agent is configured, you'll get real-time availability!`;
      } else if (lowerMessage.includes('flight') || lowerMessage.includes('search')) {
        message = `**Flight Search** (Mock)\n\nI can help you search for flights! Please provide:\n- Departure city\n- Destination\n- Travel dates\n- Number of passengers\n\nOnce the search agent is configured, you'll get real results!`;
      } else {
        message = `Hello! Welcome to EasyJetlag. I'm your AI assistant. Based on your message, I'm routing you to the **${agentType}** service.\n\nNote: This is a mock response. Configure the ${agentType} agent URL for real functionality.`;
      }
    } else {
      message = `Hello! Welcome to EasyJetlag. I'm your AI assistant. Based on your message, I'm routing you to the **${agentType}** service.\n\nNote: This is a mock response. Configure the ${agentType} agent URL for real functionality.`;
    }

    return {
      message,
      conversationId,
      data: {
        agentType,
        mock: true,
        state: 'completed'
      }
    };
  }

  /**
   * Reset conversation context
   */
  resetConversation(): void {
    this.contextId = null;
    this.taskIds.clear();
  }

  /**
   * Get current context ID (conversation ID)
   */
  getConversationId(): string | null {
    return this.contextId;
  }

  /**
   * Set context ID (for continuing conversations)
   */
  setConversationId(contextId: string): void {
    this.contextId = contextId;
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): { type: AgentType; config: AgentConfig; configured: boolean }[] {
    return (Object.keys(AGENT_REGISTRY) as AgentType[]).map(type => ({
      type,
      config: AGENT_REGISTRY[type],
      configured: !!AGENT_REGISTRY[type].url
    }));
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

/**
 * Create a new A2A client instance (useful for testing)
 */
export function createA2AClient(): A2AClient {
  return new A2AClient();
}
