# A2A Agent Integration Guide

This document provides detailed information about integrating your A2A (Agent-to-Agent) compliant agent with the EasyJetlag application.

## Overview

The application is built to communicate with A2A protocol-compliant agents. It uses a standardized message format for request/response cycles and maintains conversation state across multiple interactions.

## Architecture

```
┌─────────────┐      HTTP POST       ┌──────────────┐
│             │  ─────────────────▶  │              │
│   Next.js   │   A2A Message        │  A2A Agent   │
│   Backend   │                      │              │
│             │  ◀─────────────────  │              │
└─────────────┘   A2A Response       └──────────────┘
```

## A2A Message Protocol

### Request Format

When a user sends a message, the application creates an A2A request payload:

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // UUID v4
  type: "request",
  timestamp: "2024-02-05T10:30:00.000Z",       // ISO 8601
  payload: {
    content: "I want to book a flight to Paris",
    data: {
      // Optional context data
      preferences: {},
      previousBookings: []
    }
  },
  metadata: {
    conversationId: "conv-123456",
    userId: "user@example.com",
    sessionId: "session-abc"
  }
}
```

### Response Format

Your A2A agent should respond with:

```typescript
{
  id: "660e8400-e29b-41d4-a716-446655440001",  // UUID v4
  type: "response",
  timestamp: "2024-02-05T10:30:01.500Z",
  payload: {
    content: "I'd be happy to help you book a flight to Paris! When would you like to travel?",
    data: {
      // Optional structured data
      suggestedDates: ["2024-03-15", "2024-03-16"],
      priceRange: { min: 150, max: 300 }
    }
  },
  metadata: {
    conversationId: "conv-123456",
    agentId: "easyjetlag-agent-01",
    confidence: 0.95
  }
}
```

### Error Format

If an error occurs, respond with:

```typescript
{
  id: "770e8400-e29b-41d4-a716-446655440002",
  type: "error",
  timestamp: "2024-02-05T10:30:01.500Z",
  payload: {
    error: "Unable to process booking request",
    content: "I'm having trouble accessing the booking system. Please try again in a moment."
  },
  metadata: {
    conversationId: "conv-123456",
    errorCode: "SERVICE_UNAVAILABLE",
    retryAfter: 5000
  }
}
```

## Implementation Details

### A2A Client (`lib/a2a-client.ts`)

The client handles:
- Message creation with proper formatting
- Conversation ID management
- HTTP communication with the agent
- Error handling and retries
- Session persistence

Key methods:

```typescript
// Send a message to the agent
async sendMessage(request: A2ARequest): Promise<A2AResponse>

// Reset the conversation
resetConversation(): void

// Get current conversation ID
getConversationId(): string | null
```

### API Route (`app/api/chat/route.ts`)

The backend API endpoint:
- Authenticates the user (required)
- Adds user context to messages
- Calls the A2A client
- Returns formatted responses
- Handles errors gracefully

## Setting Up Your Agent

### 1. Agent Endpoint

Your agent should expose an HTTP POST endpoint that:
- Accepts JSON payloads
- Returns JSON responses
- Supports CORS if on different domain
- Has reasonable timeout (30s recommended)

### 2. Required Capabilities

Your agent must:
- ✅ Accept A2A message format
- ✅ Return A2A response format
- ✅ Maintain conversation context using `conversationId`
- ✅ Handle errors gracefully
- ✅ Support stateless operation (store state externally if needed)

### 3. Optional Capabilities

Your agent can:
- Return structured data in `payload.data`
- Include confidence scores
- Suggest actions or quick replies
- Return media URLs (images, files)
- Trigger webhooks for async operations

## Configuration

### Environment Variables

```env
# Your agent's HTTP endpoint
A2A_AGENT_URL=https://your-agent.example.com/api/chat

# Your agent's identifier (optional)
A2A_AGENT_ID=easyjetlag-agent-production
```

### Agent Authentication (Optional)

If your agent requires authentication, modify `lib/a2a-client.ts`:

```typescript
const response = await fetch(this.agentUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.A2A_AGENT_TOKEN}`,
    'X-Agent-ID': this.agentId,
  },
  body: JSON.stringify(a2aMessage),
});
```

## Testing Your Integration

### 1. Mock Testing (Current State)

The application includes mock responses in `getMockResponse()`. This allows you to:
- Test the UI without a real agent
- Develop frontend features independently
- Demo the application

### 2. Integration Testing

Once your agent is ready:

```bash
# Test your agent endpoint
curl -X POST https://your-agent.example.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-123",
    "type": "request",
    "timestamp": "2024-02-05T10:00:00.000Z",
    "payload": {
      "content": "Hello"
    },
    "metadata": {
      "conversationId": "test-conv"
    }
  }'
```

### 3. End-to-End Testing

1. Update `.env.local` with your agent URL
2. Remove mock responses from `lib/a2a-client.ts`
3. Run the app: `npm run dev`
4. Test various scenarios:
   - Simple questions
   - Multi-turn conversations
   - Error scenarios
   - Edge cases

## Conversation Management

### Conversation ID

The `conversationId` is crucial for maintaining context:

- **Generated**: First message in a conversation
- **Persisted**: Stored in component state
- **Sent**: With every message
- **Returned**: Agent should echo it back

### Conversation Flow

```
User: "Book a flight to Paris"
  ↓ conversationId: "conv-abc123"
Agent: "When would you like to travel?"
  ↓ conversationId: "conv-abc123"
User: "Next Friday"
  ↓ conversationId: "conv-abc123"
Agent: "I found 5 flights for next Friday..."
  ↓ conversationId: "conv-abc123"
```

### Reset Conversation

Users can reset by:
- Signing out and back in
- Refreshing the page
- (Future) Clicking a "New Conversation" button

## Advanced Features

### Structured Data

Return structured data for rich UI:

```typescript
{
  type: "response",
  payload: {
    content: "Here are available flights:",
    data: {
      flights: [
        {
          id: "FL123",
          departure: "2024-03-15T08:00:00Z",
          arrival: "2024-03-15T10:30:00Z",
          price: 150,
          currency: "EUR"
        }
      ]
    }
  }
}
```

The frontend can parse this and display a rich flight card.

### Typing Indicators

For long processing:

```typescript
{
  type: "response",
  payload: {
    content: "",
    data: {
      status: "processing",
      estimatedTime: 5000  // milliseconds
    }
  }
}
```

### Action Suggestions

Guide users with suggested actions:

```typescript
{
  type: "response",
  payload: {
    content: "Would you like to proceed?",
    data: {
      suggestedActions: [
        { label: "Yes, book it", action: "confirm_booking" },
        { label: "Show more options", action: "show_more" },
        { label: "Start over", action: "reset" }
      ]
    }
  }
}
```

## Security Considerations

### 1. Authentication

- User authentication is handled by Keycloak
- User info is passed to agent in metadata
- Consider adding agent-to-backend authentication

### 2. Data Privacy

- Don't log sensitive user data
- Encrypt data in transit (HTTPS)
- Comply with GDPR/privacy laws
- Add session timeouts

### 3. Rate Limiting

Consider adding rate limits:

```typescript
// In app/api/chat/route.ts
const rateLimiter = new RateLimiter({
  windowMs: 60000,  // 1 minute
  max: 30,          // 30 requests per minute
});
```

### 4. Input Validation

Validate all inputs:

```typescript
// In app/api/chat/route.ts
if (!message || message.length > 5000) {
  return NextResponse.json(
    { error: 'Message too long' },
    { status: 400 }
  );
}
```

## Monitoring & Logging

### Recommended Logging

```typescript
// In lib/a2a-client.ts
console.log('[A2A] Request:', {
  conversationId: this.conversationId,
  messageLength: request.message.length,
  timestamp: new Date().toISOString(),
});

console.log('[A2A] Response:', {
  conversationId: response.conversationId,
  responseLength: response.message.length,
  duration: Date.now() - startTime,
});
```

### Metrics to Track

- Average response time
- Error rate
- Conversation length (messages per conversation)
- User satisfaction (if implemented)
- Most common queries

## Troubleshooting

### Agent Not Responding

1. Check agent URL is correct
2. Verify agent is running
3. Check network connectivity
4. Review CORS settings
5. Check agent logs

### Invalid Response Format

1. Verify agent returns proper JSON
2. Check `Content-Type: application/json` header
3. Validate response structure matches A2A format
4. Check for extra/missing fields

### Conversation Context Lost

1. Ensure `conversationId` is being returned
2. Check frontend state management
3. Verify agent is storing/retrieving context
4. Check for session timeouts

### Performance Issues

1. Optimize agent response time
2. Add caching for common queries
3. Implement connection pooling
4. Use async processing for long operations

## Example Agent Implementations

### Python (Flask)

```python
from flask import Flask, request, jsonify
import uuid
from datetime import datetime

app = Flask(__name__)

# Store conversations (use Redis/DB in production)
conversations = {}

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    
    conv_id = data['metadata']['conversationId']
    user_message = data['payload']['content']
    
    # Store conversation history
    if conv_id not in conversations:
        conversations[conv_id] = []
    conversations[conv_id].append(user_message)
    
    # Generate response (integrate your AI here)
    response_text = generate_response(user_message, conversations[conv_id])
    
    # Return A2A format
    return jsonify({
        'id': str(uuid.uuid4()),
        'type': 'response',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'payload': {
            'content': response_text
        },
        'metadata': {
            'conversationId': conv_id,
            'agentId': 'easyjetlag-agent'
        }
    })

def generate_response(message, history):
    # Your AI logic here
    return f"You said: {message}"

if __name__ == '__main__':
    app.run(port=5000)
```

### Node.js (Express)

```javascript
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const conversations = new Map();

app.post('/api/chat', async (req, res) => {
  const { metadata, payload } = req.body;
  const { conversationId } = metadata;
  const { content } = payload;
  
  // Store conversation
  if (!conversations.has(conversationId)) {
    conversations.set(conversationId, []);
  }
  conversations.get(conversationId).push(content);
  
  // Generate response
  const responseText = await generateResponse(
    content, 
    conversations.get(conversationId)
  );
  
  // Return A2A format
  res.json({
    id: uuidv4(),
    type: 'response',
    timestamp: new Date().toISOString(),
    payload: {
      content: responseText
    },
    metadata: {
      conversationId,
      agentId: 'easyjetlag-agent'
    }
  });
});

async function generateResponse(message, history) {
  // Your AI logic here
  return `You said: ${message}`;
}

app.listen(5000, () => {
  console.log('Agent running on port 5000');
});
```

## Next Steps

1. ✅ Review A2A message format
2. ✅ Set up agent endpoint
3. ✅ Implement request handling
4. ✅ Test with curl/Postman
5. ✅ Configure environment variables
6. ✅ Update `lib/a2a-client.ts`
7. ✅ Test integration end-to-end
8. ✅ Deploy to production
9. ✅ Monitor and optimize

## Support

For questions about A2A integration:
- Review this document
- Check `lib/a2a-client.ts` for implementation details
- Test with mock responses first
- Ensure agent follows the protocol exactly

---

**Ready to integrate?** Update `.env.local` with your agent URL and start testing!
