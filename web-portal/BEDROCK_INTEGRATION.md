# Bedrock Intent Detection Integration

This application uses AWS Bedrock Agent to detect user intent before routing to specialized agents.

## Architecture Flow

```
User Message
    ↓
Bedrock Intent Agent
    ↓
Detects: SEARCHING or BOOKING
    ↓
Routes to appropriate agent:
    - SEARCHING → Search Agent (A2A)
    - BOOKING → Booking Agent (A2A)
    ↓
Response to User
```

## Configuration

### Authentication Method

**This application uses AWS IAM credentials** (Access Key ID + Secret Access Key) with the official AWS SDK v3.

See [AWS_IAM_SETUP.md](./AWS_IAM_SETUP.md) for detailed setup instructions.

### Environment Variables

Add these to your `.env.local`:

```env
# AWS IAM Credentials for Bedrock
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-2

# Bedrock Intent Agent Configuration
BEDROCK_INTENT_AGENT_ID=NN0I5PKGOR
BEDROCK_INTENT_ALIAS_ID=YXQHYFUAIW

# A2A Agents (to be configured)
A2A_BOOKING_AGENT_URL=https://your-booking-agent-url.com
A2A_SEARCH_AGENT_URL=https://your-search-agent-url.com
```

**Note:** Uses standard AWS IAM authentication with the AWS SDK.

### Bedrock Agent Configuration

The intent agent is configured to:
- Return exactly one word: `SEARCHING` or `BOOKING`
- Use linguistic analysis to determine user intent
- Default to `SEARCHING` if ambiguous

## Intent Detection Logic

### SEARCHING Intent
Triggered when user is:
- Inquiring about availability
- Checking prices
- Asking "if" a flight exists
- Looking for schedules

**Keywords:** "Are there flights", "How much is", "Check availability", "Show me options"

**Examples:**
- "What flights do you have from London to New York on Friday?"
- "Is there a cheap way to get to Tokyo next month?"
- "Show me available flights to Paris"

### BOOKING Intent
Triggered when user:
- Expresses clear intent to purchase
- Wants to reserve a flight
- Ready to initiate transaction

**Keywords:** "Book me", "Reserve", "I want to buy", "Get me on that flight", "Confirm a seat"

**Examples:**
- "I'd like to book the 10:00 AM flight to Paris for two people."
- "Reserve a seat for me on the next available flight to Austin."
- "Book the morning flight tomorrow"

## Implementation Details

### 1. Bedrock Client (`lib/bedrock-client.ts`)

The client uses the official AWS SDK v3 with IAM credentials:

```typescript
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from '@aws-sdk/client-bedrock-agent-runtime';

const bedrockClient = getBedrockClient();

const result = await bedrockClient.detectIntent({
  inputText: "I want to book a flight to Paris",
  sessionId: conversationId,
  enableTrace: false
});

console.log(result.intent); // "BOOKING"
```

**Benefits of AWS SDK:**
- ✅ Official AWS authentication
- ✅ Automatic request signing
- ✅ Built-in retry logic
- ✅ Type-safe TypeScript support
- ✅ Streaming response handling
- ✅ Production-ready

See [AWS_IAM_SETUP.md](./AWS_IAM_SETUP.md) for IAM setup instructions.

### 2. API Route (`app/api/chat/route.ts`)

The chat API now:
1. Receives user message
2. Calls Bedrock intent agent
3. Determines intent (SEARCHING or BOOKING)
4. Routes to appropriate A2A agent
5. Returns response with intent metadata

### 3. Response Format

```json
{
  "success": true,
  "data": {
    "message": "Agent response here...",
    "conversationId": "conv-123",
    "intent": "BOOKING",
    "agentType": "booking",
    "intentDetectionError": null
  }
}
```

## Session Management

- Uses the conversation ID as the Bedrock `sessionId`
- Maintains context across multiple messages
- Each conversation has a unique session

## Error Handling

If Bedrock intent detection fails:
- Falls back to `SEARCHING` intent (safe default)
- Logs error details
- Continues with A2A agent call
- Returns error info in response metadata

## Testing

### Test SEARCHING Intent

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "message": "What flights are available to Paris?",
    "conversationId": "test-123"
  }'
```

Expected: Routes to search agent

### Test BOOKING Intent

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "message": "Book me a flight to Paris tomorrow",
    "conversationId": "test-123"
  }'
```

Expected: Routes to booking agent

## UI Indicators

The chat interface shows:
- 🔍 for SEARCHING intent
- 🎫 for BOOKING intent
- Intent detection message in blue system message

## Mock Responses

Until A2A agents are configured, the system uses mock responses:

**Search Agent Mock:**
- Shows sample flight results
- Indicates mock mode
- Helpful for testing UI

**Booking Agent Mock:**
- Shows booking flow outline
- Indicates mock mode
- Helpful for testing routing

## Connecting Real A2A Agents

When your A2A agents are ready:

1. **Update environment variables:**
   ```env
   A2A_BOOKING_AGENT_URL=https://your-real-booking-agent.com
   A2A_SEARCH_AGENT_URL=https://your-real-search-agent.com
   ```

2. **The system will automatically:**
   - Stop using mock responses
   - Call real agents
   - Pass intent in context
   - Handle errors gracefully

## Monitoring & Debugging

### Console Logs

The system logs:
- `[Bedrock] Detecting intent:` - Intent detection request
- `[Bedrock] Raw response:` - Bedrock response
- `[Bedrock] Detected intent:` - Final intent
- `[Chat API] Routing to agent:` - Agent selection
- `[A2A] Sending to {type} agent:` - A2A call

### Check Configuration

```typescript
const bedrockClient = getBedrockClient();
console.log(bedrockClient.isConfigured()); // true if all env vars set
```

## Troubleshooting

### Intent Always Returns SEARCHING

**Cause:** Bedrock agent may not be responding with expected format

**Fix:** Check Bedrock console logs for raw response format

### Bedrock API Errors

**Cause:** Invalid credentials or network issues

**Fix:**
- Verify API key is correct
- Check agent ID and alias ID
- Confirm region is `us-east-2`
- Check network connectivity

### No Intent Detection

**Cause:** Bedrock not configured

**Fix:** 
- Ensure all `BEDROCK_*` env vars are set
- Restart dev server after adding env vars
- Check logs for configuration warnings

## API Reference

### Bedrock Endpoint

```
POST https://bedrock-agent-runtime.{region}.amazonaws.com/agents/{agentId}/agentAliases/{aliasId}/sessions/{sessionId}/text
```

### Authentication

The AWS SDK handles authentication automatically:

**For ABSK keys (what we use):**
```typescript
new BedrockAgentRuntimeClient({
  region: 'us-east-2',
  credentials: {
    accessKeyId: 'ABSK_YOUR_API_KEY_HERE',
    secretAccessKey: 'not-needed-for-absk',
  },
});
```

**For IAM credentials:**
- The SDK automatically uses environment variables or IAM roles
- No manual configuration needed

### Request

```json
{
  "inputText": "User message here",
  "enableTrace": false
}
```

### Response (Expected)

```json
{
  "completion": "SEARCHING",
  "sessionId": "session-123"
}
```

## Best Practices

1. **Always provide context:** Include conversation history if needed
2. **Handle errors gracefully:** Fallback to SEARCHING on errors
3. **Monitor intent accuracy:** Log and review intent detections
4. **Use session IDs consistently:** One session per conversation
5. **Test edge cases:** Ambiguous phrases, typos, mixed intents

## Next Steps

1. ✅ Bedrock intent agent configured
2. ✅ Routing logic implemented
3. ⏳ Configure booking agent A2A endpoint
4. ⏳ Configure search agent A2A endpoint
5. ⏳ Test end-to-end flow
6. ⏳ Monitor and optimize intent accuracy

---

**Current Status:** Bedrock integration complete. Intent detection active. A2A agents using mock responses until configured.
