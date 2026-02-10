// A2A Protocol Types (Google A2A / JSON-RPC format)

// A2A Message Part - represents a piece of content in a message
export interface A2AMessagePart {
  kind: 'text' | 'file' | 'data';
  text?: string;
  file?: {
    name: string;
    mimeType: string;
    bytes?: string; // base64 encoded
    uri?: string;
  };
  data?: Record<string, unknown>;
}

// A2A Message - the message sent to/from an agent
export interface A2AAgentMessage {
  messageId: string;
  role: 'user' | 'agent';
  parts: A2AMessagePart[];
  contextId?: string;
  taskId?: string;
}

// A2A Task Status
export interface A2ATaskStatus {
  state: 'submitted' | 'working' | 'input_required' | 'completed' | 'failed' | 'canceled';
  message?: A2AAgentMessage;
}

// A2A Task Artifact
export interface A2AArtifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: A2AMessagePart[];
  index?: number;
  append?: boolean;
  lastChunk?: boolean;
}

// A2A Task - represents a unit of work
export interface A2ATask {
  id: string;
  contextId: string;
  status: A2ATaskStatus;
  artifacts?: A2AArtifact[];
  history?: A2AAgentMessage[];
}

// JSON-RPC Request format for A2A
export interface A2AJsonRpcRequest {
  jsonrpc: '2.0';
  id: string;
  method: 'message/send' | 'message/stream' | 'tasks/get' | 'tasks/cancel';
  params: {
    message?: {
      messageId: string;
      role: 'user';
      parts: A2AMessagePart[];
      contextId?: string;
      taskId?: string;
    };
    configuration?: {
      blocking?: boolean;
      acceptedOutputModes?: string[];
    };
    id?: string; // for tasks/get and tasks/cancel
  };
}

// JSON-RPC Response format for A2A
export interface A2AJsonRpcResponse {
  jsonrpc: '2.0';
  id: string;
  result?: {
    task?: A2ATask;
    // Direct result fields (alternative format used by some implementations)
    id?: string;
    contextId?: string;
    status?: A2ATaskStatus;
    artifacts?: A2AArtifact[];
  };
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Legacy A2A Message format (for backwards compatibility)
export interface A2AMessage {
  id: string;
  type: 'request' | 'response' | 'error';
  timestamp: string;
  payload: {
    action?: string;
    data?: any;
    content?: string;
    error?: string;
  };
  metadata?: {
    conversationId?: string;
    userId?: string;
    sessionId?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export interface A2ARequest {
  message: string;
  conversationId?: string;
  context?: Record<string, any>;
  accessToken?: string;
}

export interface A2AResponse {
  message: string;
  conversationId: string;
  data?: any;
  error?: string;
  intent?: 'SEARCHING' | 'BOOKING';
  agentType?: 'booking' | 'search';
}

// Session Types
export interface UserSession {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  accessToken?: string;
  expires: string;
}
