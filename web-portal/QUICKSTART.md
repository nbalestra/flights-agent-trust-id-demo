# 🚀 Quick Start Guide - Bedrock Intent Detection

## What's Been Implemented

✅ **AWS Bedrock Intent Agent** - Detects SEARCHING vs BOOKING intent  
✅ **Intelligent Routing** - Routes to appropriate A2A agent based on intent  
✅ **Mock A2A Agents** - Search and Booking agents (ready for your endpoints)  
✅ **UI Indicators** - Shows detected intent in chat interface

## Current Status

🟢 **Working:** Bedrock intent detection  
🟢 **Working:** Intent-based routing logic  
🟡 **Mock Mode:** A2A agents (awaiting your endpoints)

## Test It Now

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Login** at http://localhost:3000

3. **Try these messages:**

### Test SEARCHING Intent 🔍
```
"What flights are available to Paris?"
"Show me options for tomorrow"
"Are there any cheap flights to London?"
```
Expected: Routes to Search Agent (mock response)

### Test BOOKING Intent 🎫
```
"Book me a flight to Paris"
"I want to reserve the 10am flight"
"Get me a seat on tomorrow's flight"
```
Expected: Routes to Booking Agent (mock response)

## How It Works

```
1. User sends message
   ↓
2. Bedrock Intent Agent analyzes
   ↓
3. Returns: SEARCHING or BOOKING
   ↓
4. System routes to appropriate agent:
   - SEARCHING → Search Agent (A2A)
   - BOOKING → Booking Agent (A2A)
   ↓
5. Response shown with intent indicator
```

## Configuration Status

### ✅ Configured (Bedrock Intent Agent)
```env
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
AWS_REGION=us-east-2
BEDROCK_INTENT_AGENT_ID=NN0I5PKGOR
BEDROCK_INTENT_ALIAS_ID=YXQHYFUAIW
```

### ⏳ To Be Configured (A2A Agents)
```env
A2A_BOOKING_AGENT_URL=https://your-booking-agent-url.com
A2A_SEARCH_AGENT_URL=https://your-search-agent-url.com
```

## Next Steps

### 1. Test Intent Detection
- Try various queries
- Verify intent is correctly detected
- Check browser console for logs

### 2. Configure A2A Agents
When ready, update `.env.local`:
```env
A2A_BOOKING_AGENT_URL=https://your-real-booking-agent.com
A2A_SEARCH_AGENT_URL=https://your-real-search-agent.com
```

### 3. Remove Mock Responses
The system automatically switches from mock to real agents when URLs are configured!

## Monitoring

### Browser Console
```
[Bedrock] Detecting intent: ...
[Bedrock] Detected intent: SEARCHING
[Chat API] Routing to agent: search
[A2A] Sending to search agent: ...
```

### UI Indicators
- Blue system message shows detected intent
- 🔍 icon for SEARCHING
- 🎫 icon for BOOKING

## Example Conversation

```
User: "What flights go to Paris?"
System: 🔍 Intent detected: Searching
Agent: ✈️ Flight Search (Mock)
       Searching for flights to Paris...
       Found 5 available flights: ...

User: "Book the 10am flight"
System: 🎫 Intent detected: Booking
Agent: 🎫 Booking Assistant (Mock)
       I detected you want to book a flight! ...
```

## Troubleshooting

### Intent not detected
- Check `.env.local` has Bedrock credentials
- Restart dev server: `npm run dev`
- Check terminal logs for errors

### Always returns SEARCHING
- Bedrock agent working correctly (defaults to SEARCHING)
- Try explicit booking phrases: "book", "reserve", "buy"

### Mock responses not helpful
- This is expected until A2A agents configured
- Shows the system is working
- Ready for real agents

## Files Modified

1. **`.env.local`** - Added Bedrock credentials
2. **`lib/bedrock-client.ts`** - NEW: Bedrock client
3. **`lib/a2a-client.ts`** - Updated for multi-agent routing
4. **`app/api/chat/route.ts`** - Added intent detection flow
5. **`app/chat/page.tsx`** - Added intent indicators

## Documentation

- **BEDROCK_INTEGRATION.md** - Complete Bedrock integration guide
- **A2A_INTEGRATION.md** - A2A agent integration guide
- **SETUP.md** - General setup instructions

## Support

Having issues? Check:
1. Terminal logs for errors
2. Browser console for client logs
3. Bedrock credentials are correct
4. Dev server is running

---

**You're all set!** The Bedrock intent detection is live and working. Test it out, then configure your A2A agent endpoints when ready! 🎉
