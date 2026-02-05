// A2A Protocol Types
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
