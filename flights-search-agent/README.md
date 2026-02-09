# Flight Search Agent - A2A Protocol (JSON-RPC)

A Python AI agent for flight search using **LangChain**, **AWS Bedrock**, and the **A2A Protocol** with **JSON-RPC 2.0** interface.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Features

- ✅ **A2A Protocol Compliant**: Full Agent2Agent protocol using [official SDK](https://github.com/a2aproject/a2a-python)
- ✅ **JSON-RPC 2.0**: Single `/agent` endpoint for all operations
- ✅ **LangChain Framework**: Powerful agent orchestration
- ✅ **AWS Bedrock**: Claude 3 Sonnet for natural language understanding  
- ✅ **Tool Calling**: Native function calling for flight search
- ✅ **Mock MCP Server**: Simulated Model Context Protocol
- ✅ **Self-Describing**: AgentCard with capabilities and skills
- ✅ **Smart State Management**: Returns `input_required` when clarification needed
- ✅ **Task Artifacts**: Results stored as task artifacts
- ✅ **Context Groups**: Multi-turn conversation support

## Quick Start

### 1. Install Dependencies

```bash
cd flights-search-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your AWS credentials:
```bash
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
BEDROCK_MODEL_ID=your model
PORT=5000
```

### 3. Start the A2A Server

```bash
python run_a2a.py
```

Or use the start script:
```bash
./start.sh
```

### 4. Test the Agent

#### Get AgentCard
```bash
curl http://localhost:5000/.well-known/agent-card.json | jq
```

#### Send JSON-RPC Message
```bash
curl -X POST http://localhost:5000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [
          {
            "kind": "text",
            "text": "Find me flights from New York to London under $500"
          }
        ],
        "messageId": "test-001"
      },
      "configuration": {"blocking": true}
    }
  }' | jq
```

#### Run Test Suite
```bash
python test_a2a_client.py
```

## Architecture

```
A2A Client
    ↓
JSON-RPC 2.0 Request
    ↓
POST /agent (Single Endpoint)
    ↓
A2A JSON-RPC FastAPI Application
    ↓
FlightSearchAgentExecutor
    ↓
LangChain Agent + AWS Bedrock
    ↓
Flight Search Tool → Mock MCP Client
    ↓
TaskStatusUpdateEvent / TaskArtifactUpdateEvent
    ↓
JSON-RPC 2.0 Response
```

## Project Structure

```
flights-search-agent/
├── agent/                      # Source code package
│   ├── __init__.py            # Package initialization
│   ├── a2a_main.py            # A2A FastAPI application
│   ├── a2a_server.py          # A2A AgentExecutor implementation
│   ├── agent_core.py          # LangChain agent
│   ├── config.py              # Configuration management
│   └── mcp_tools.py           # Mock MCP tools
│
├── run_a2a.py                  # Main entry point
├── start.sh                    # Startup script
│
├── test_a2a_client.py         # A2A protocol tests
├── test_agent.py              # Agent tests
├── test_aws_credentials.py    # AWS setup tests
│
├── requirements.txt           # Dependencies
├── .env.example               # Example configuration
├── .env.local                 # Your configuration (git-ignored)
│
└── README.md                  # This file
```

## A2A Protocol Endpoints

The server provides a **single JSON-RPC endpoint** for all operations:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/agent` | POST | All operations via JSON-RPC (see methods below) |
| `/.well-known/agent-card.json` | GET | AgentCard (agent capabilities) |

### JSON-RPC Methods

All operations go through `POST /agent` with the `method` field specifying the operation:

| Method | Description |
|--------|-------------|
| `message/send` | Send message to agent |
| `message/stream` | Stream message response |
| `tasks/get` | Get task status |
| `tasks/cancel` | Cancel a task |
| `tasks/list` | List all tasks |

## JSON-RPC 2.0 Format

### Get AgentCard

```bash
GET /.well-known/agent-card.json
```

**Response:**
```json
{
  "name": "Flight Search Agent",
  "description": "AI-powered flight search agent using LangChain and AWS Bedrock",
  "version": "1.0.0",
  "skills": [
    {
      "id": "search_flights",
      "name": "search_flights",
      "description": "Search for flights based on origin, destination, and budget",
      "tags": ["flight", "search", "travel", "booking"]
    }
  ],
  "capabilities": {
    "streaming": false,
    "context_grouping": true,
    "natural_language": true
  }
}
```

### Send Message Request

```bash
POST /agent
```

**Request Body:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "Find flights from New York to London under $500"
        }
      ],
      "messageId": "msg-001"
    },
    "configuration": {
      "blocking": true
    }
  }
}
```

### Completed Response (Full Results)

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "task": {
      "id": "task-uuid",
      "contextId": "context-uuid",
      "status": {
        "state": "completed",
        "timestamp": "2024-02-08T20:00:05Z"
      },
      "artifacts": [
        {
          "name": "flight_search_result",
          "description": "Flight search results",
          "kind": "text",
          "text": "I found 3 flights from New York to London under $500:\n\n1. Alaska Airlines..."
        }
      ]
    }
  }
}
```

### Input Required Response (Needs Clarification)

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "task": {
      "id": "task-uuid",
      "contextId": "context-uuid",
      "status": {
        "state": "input_required",
        "message": {
          "role": "agent",
          "parts": [
            {
              "kind": "text",
              "text": "I'm here to help you find flights. Could you please provide:\n1. Departure city\n2. Arrival city\n3. Budget (optional)"
            }
          ]
        },
        "timestamp": "2024-02-08T20:00:02Z"
      }
    }
  }
}
```

## Multi-Turn Conversations

Use `context_group_id` for conversation history:

```bash
# First message
# Already updated above in Multi-Turn Conversations section
```

## Example Queries

The agent understands natural language. Send queries via JSON-RPC:

### Complete Queries (returns `completed` state)
- "Find me flights from New York to London under $500"
- "Show me cheap flights from LAX to JFK with a budget of $300"
- "Search for direct flights from San Francisco to Tokyo"

### Incomplete Queries (returns `input_required` state)
- "Find me flights" ← Missing origin/destination
- "I need to fly" ← Missing details
- "Show me cheap flights" ← Missing route

The agent will ask for clarification when information is missing.

## Configuration

All settings in `.env.local`:

| Variable | Description | Default |
|----------|-------------|---------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | AWS access key | Required |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Required |
| `BEDROCK_MODEL_ID` | Bedrock model | `anthropic.claude-3-sonnet-20240229-v1:0` |
| `HOST` | Server host | `0.0.0.0` |
| `PORT` | Server port | `5000` |
| `MCP_SERVER_URL` | MCP server URL | `http://localhost:8080` |
| `MCP_ENABLED` | Enable MCP | `true` |

## Technology Stack

- **A2A Protocol**: [a2a-sdk[http-server]](https://github.com/a2aproject/a2a-python) - Official A2A SDK with JSON-RPC
- **JSON-RPC 2.0**: Standard remote procedure call protocol
- **LangChain**: Agent framework with tool calling
- **AWS Bedrock**: Claude 3 Sonnet via boto3
- **FastAPI**: High-performance web framework (via A2A SDK)
- **Pydantic**: Data validation and settings
- **httpx**: Async HTTP client for MCP

## Testing

### Test AWS Credentials
```bash
python test_aws_credentials.py
```

### Test LangChain Agent
```bash
python test_agent.py
```

### Test A2A Protocol
```bash
python test_a2a_client.py
```

### Test Bedrock API Directly
```bash
python test_bedrock_direct.py
```

## Mock MCP Server

Currently uses mock flight data. To integrate a real MCP server:

1. Update `MCP_SERVER_URL` in `.env.local`
2. Modify `agent/mcp_tools.py` to call real MCP server
3. Restart the agent

## AWS Bedrock Setup

1. Enable Claude 3 Sonnet in [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Ensure your IAM user has `bedrock:InvokeModel` permission
3. Configure credentials in `.env.local`

See [MODEL_SELECTION.md](MODEL_SELECTION.md) for choosing the right model.

## Troubleshooting

### AWS Credentials
```bash
python test_aws_credentials.py
```

### Configuration
```bash
python verify_config.py
```

### Diagnose Issues
```bash
python diagnose_credentials.py
```

### Enable Debug Logging
Edit `.env.local`:
```bash
LOG_LEVEL=DEBUG
```

## Python Best Practices

- ✅ Type hints throughout
- ✅ Async/await patterns
- ✅ Structured logging
- ✅ Pydantic settings management
- ✅ Proper package structure
- ✅ Error handling
- ✅ Comprehensive tests

## Resources

- [A2A Protocol Specification](https://a2a-protocol.org/)
- [A2A Python SDK](https://github.com/a2aproject/a2a-python)
- [LangChain Documentation](https://python.langchain.com/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## License

MIT License

---

## Quick Reference

### Start Server
```bash
python run_a2a.py
```

### Test AgentCard
```bash
curl http://localhost:5000/.well-known/agent-card.json | jq
```

### Send JSON-RPC Message
```bash
curl -X POST http://localhost:5000/agent \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Find flights from NYC to London under $500"}],
        "messageId": "test-001"
      },
      "configuration": {"blocking": true}
    }
  }' | jq
```

### Run Tests
```bash
python test_a2a_client.py
```

---

**Your A2A-compliant flight search agent!** ✈️🤖✨
