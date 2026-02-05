# Debug Pane Documentation

## Overview

The Debug Pane is a real-time debugging tool that displays on the right side of the screen and tracks all actions happening in the application.

## Features

✅ **Real-time logging** - All actions logged instantly  
✅ **Expandable entries** - Click to see full details  
✅ **Color-coded types** - Easy visual identification  
✅ **Latest action highlighted** - Orange ring around newest entry  
✅ **Collapsible** - Can be hidden when not needed  
✅ **Clear logs** - Reset all logs with one click  
✅ **Auto-scroll** - Latest logs appear at top  

## Current Logged Actions

### 1. **Login Actions** 🔐
- User initiates login
- Successful login with user details
- Provider information (Keycloak)

### 2. **Search Queries** 🔍
- User query text
- Detected intent: SEARCHING
- Routed to: Search Agent
- Agent response
- Conversation ID

### 3. **Booking Queries** 🎫
- User query text
- Detected intent: BOOKING
- Routed to: Booking Agent
- Agent response
- Conversation ID

### 4. **Errors** ⚠️
- Error messages
- Failed queries
- Stack traces

## UI Components

### Debug Pane Location
- **Position**: Fixed on right side of screen
- **Width**: 384px (24rem)
- **Height**: Full screen height minus header

### Visual Indicators

**Log Types & Colors:**
- 🔐 **Login** - Blue background
- 🔍 **Search** - Green background
- 🎫 **Booking** - Orange background
- ⚠️ **Error** - Red background
- ℹ️ **Info** - Gray background

**Status Indicators:**
- 🟢 Green pulsing dot - Active
- Latest log has orange ring highlight
- Log count shown in header

### Controls

1. **Minimize** - Collapse pane to small button
2. **Clear** - Remove all logs
3. **Expand/Collapse** - Toggle individual log details

## Log Entry Structure

Each log entry contains:

```typescript
{
  id: string;              // Unique identifier
  timestamp: Date;         // When action occurred
  action: string;          // Human-readable action name
  type: 'login' | 'search' | 'booking' | 'error' | 'info';
  details: {
    userQuery?: string;              // User's input
    detectedIntent?: 'SEARCHING' | 'BOOKING';
    agentType?: 'search' | 'booking';
    response?: string;               // Agent response
    error?: string;                  // Error message if any
    user?: {
      name?: string;
      email?: string;
    };
    conversationId?: string;
    [key: string]: any;             // Additional fields
  };
}
```

## Usage

### Viewing Logs

1. **Latest First**: Most recent logs appear at the top
2. **Click to Expand**: Click any log entry to see full details
3. **Timestamp**: Each log shows time of occurrence
4. **Auto-highlight**: Latest action has orange ring

### Managing Logs

**Clear All Logs:**
```
Click the trash icon in the header
```

**Hide Pane:**
```
Click the X button - pane collapses to small button on right
```

**Show Pane:**
```
Click the "Debug" button on the right edge
```

## Developer Usage

### Adding New Log Entries

```typescript
import { useDebug } from '@/contexts/DebugContext';

function MyComponent() {
  const { addLog } = useDebug();
  
  const handleAction = () => {
    addLog({
      action: 'Custom action performed',
      type: 'info',
      details: {
        customField: 'value',
        additionalData: { foo: 'bar' },
      },
    });
  };
}
```

### Log Types

**Use appropriate types for actions:**

```typescript
// Login/Authentication
addLog({
  action: 'User logged in',
  type: 'login',
  details: { user: { name, email } },
});

// Search Intent
addLog({
  action: 'Search query processed',
  type: 'search',
  details: {
    userQuery: 'Show me flights',
    detectedIntent: 'SEARCHING',
    agentType: 'search',
  },
});

// Booking Intent
addLog({
  action: 'Booking query processed',
  type: 'booking',
  details: {
    userQuery: 'Book a flight',
    detectedIntent: 'BOOKING',
    agentType: 'booking',
  },
});

// Errors
addLog({
  action: 'Query failed',
  type: 'error',
  details: {
    error: 'Connection timeout',
    userQuery: originalQuery,
  },
});

// General Info
addLog({
  action: 'Configuration loaded',
  type: 'info',
  details: { config: {...} },
});
```

## Current Integration Points

### 1. Authentication (app/page.tsx)
```typescript
// When user clicks login
addLog({
  action: 'User initiated login',
  type: 'login',
  details: { provider: 'Keycloak' },
});

// After successful login
addLog({
  action: 'User logged in successfully',
  type: 'login',
  details: {
    user: { name, email },
    provider: 'Keycloak',
  },
});
```

### 2. Chat Queries (app/chat/page.tsx)
```typescript
// After intent detection and response
addLog({
  action: `Query processed - ${intent} intent detected`,
  type: intent === 'BOOKING' ? 'booking' : 'search',
  details: {
    userQuery,
    detectedIntent: intent,
    agentType,
    response,
    conversationId,
  },
});

// On error
addLog({
  action: 'Error processing query',
  type: 'error',
  details: {
    userQuery,
    error: errorMessage,
  },
});
```

## Future Enhancements

### Planned Features

1. **Export Logs** - Download logs as JSON/CSV
2. **Filter by Type** - Show only specific log types
3. **Search Logs** - Search through log entries
4. **Performance Metrics** - Response times, latency
5. **Agent Traces** - Detailed Bedrock agent traces
6. **Network Requests** - HTTP request/response details
7. **State Changes** - Track application state changes
8. **Timestamps Filter** - Filter by time range

### Adding New Steps

As the application evolves, add logging at key points:

```typescript
// Example: Before calling Bedrock
addLog({
  action: 'Invoking Bedrock agent',
  type: 'info',
  details: {
    agentId,
    sessionId,
    inputText,
  },
});

// Example: After receiving Bedrock response
addLog({
  action: 'Bedrock response received',
  type: 'info',
  details: {
    completion,
    processingTime: `${duration}ms`,
  },
});

// Example: Before routing to A2A agent
addLog({
  action: 'Routing to A2A agent',
  type: 'info',
  details: {
    agentType,
    agentUrl,
    payload,
  },
});
```

## Styling

The debug pane uses:
- **Tailwind CSS** for styling
- **Lucide Icons** for icons
- **Custom colors** matching EasyJet brand
- **Responsive design** (fixed width on desktop)

### Customization

To modify pane width:
```tsx
// In components/DebugPane.tsx
<div className="w-96"> // Change from w-96 (384px)
```

To modify colors:
```tsx
// In getTypeColor function
case 'search':
  return 'text-green-600 bg-green-50'; // Modify these colors
```

## Best Practices

### ✅ DO:
- Log significant actions
- Include relevant context
- Use appropriate log types
- Keep action names concise
- Include timestamps automatically

### ❌ DON'T:
- Log every keystroke
- Include sensitive data (passwords, tokens)
- Create duplicate logs
- Use overly verbose action names

## Troubleshooting

### Pane Not Showing
- Check that DebugProvider is in app layout
- Verify DebugPane is rendered in chat page
- Check for CSS z-index conflicts

### Logs Not Appearing
- Ensure useDebug hook is called
- Check console for errors
- Verify addLog is being called

### Performance Issues
- Clear old logs regularly
- Limit log detail size
- Don't log in tight loops

## Summary

The Debug Pane provides:
- ✅ Real-time visibility into application flow
- ✅ Easy debugging during development
- ✅ User action tracking
- ✅ Intent detection monitoring
- ✅ Error tracking

**Location**: Right side of screen (collapsible)  
**Status**: Active and logging all key actions  
**Expandable**: Ready for additional logging points

---

**Ready to use!** The debug pane is now active and tracking login, search, and booking actions. 🎉
