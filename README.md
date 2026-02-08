# Flights Agent Trust ID Demo

A comprehensive demonstration of AI agent technologies including A2A (Agent-to-Agent) protocol, MCP (Model Context Protocol), and enterprise authentication.

## 🚀 Projects

### 1. Flight Search A2A Agent (NEW!)

A Python-based AI agent implementing the A2A protocol for flight searches.

**Features**:
- ✅ Full A2A Protocol compliance (v1.0)
- ✅ AgentCard with capabilities and skills
- ✅ MCP server integration for flight data
- ✅ AWS Bedrock (Claude 3) for NLP
- ✅ Streaming responses
- ✅ Task lifecycle management
- ✅ Multi-turn conversations

**Quick Start**:
```bash
cd flights-search-agent
./start.sh
```

📖 [Full Documentation](flights-search-agent/README.md) | 🚀 [Quick Start Guide](flights-search-agent/QUICKSTART.md)

---

### 2. Web Portal

A Next.js web application for flight search with authentication and chat interface.

**Features**:
- Keycloak authentication
- AWS Bedrock integration
- A2A protocol client
- Debug pane for development

**Quick Start**:
```bash
cd web-portal
npm install
npm run dev
```

📖 [Web Portal Documentation](web-portal/README.md)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Users / Agents                        │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
                │ Web UI                  │ A2A Protocol
                │                         │
┌───────────────▼───────────┐  ┌─────────▼──────────────────┐
│      Web Portal            │  │  Flight Search A2A Agent   │
│      (Next.js)             │  │  (Python/FastAPI)          │
│                            │  │                             │
│  • Keycloak Auth          │  │  • A2A Endpoints           │
│  • AWS Bedrock Chat       │  │  • AgentCard               │
│  • A2A Client             │  │  • Task Management         │
└───────────────┬───────────┘  └─────────┬──────────────────┘
                │                         │
                │                         │ MCP Protocol
                │                         │
                │              ┌──────────▼──────────────────┐
                │              │   MCP Server                │
                │              │   (Flight Data)             │
                │              │                             │
                │              │  • Flight Search           │
                │              │  • Tool Discovery          │
                │              │  • Mock Data               │
                └──────────────┴─────────────────────────────┘
```

## 📚 Documentation

### Flight Search A2A Agent
- [README](flights-search-agent/README.md) - Complete documentation
- [QUICKSTART](flights-search-agent/QUICKSTART.md) - Get started in 5 minutes
- [IMPLEMENTATION_GUIDE](flights-search-agent/IMPLEMENTATION_GUIDE.md) - Technical details

### Web Portal
- [README](web-portal/README.md) - Portal documentation
- [SETUP](web-portal/SETUP.md) - Setup instructions
- [A2A_INTEGRATION](web-portal/A2A_INTEGRATION.md) - A2A integration guide

### Getting Started Guides
- [GETTING_STARTED](GETTING_STARTED.md) - Overall project guide
- [ARCHITECTURE](ARCHITECTURE.md) - System architecture

## 🎯 Key Features

### A2A Protocol Support
- **AgentCard**: Self-describing agent manifest
- **SendMessage**: Synchronous and asynchronous messaging
- **Streaming**: Real-time response streaming
- **Task Management**: Complete lifecycle handling
- **Context Grouping**: Multi-turn conversations

### MCP Integration
- Tool discovery
- Flight search capabilities
- Extensible tool system
- Mock data for development

### Authentication & Security
- Keycloak integration
- JWT token handling
- AWS IAM for Bedrock
- Environment-based secrets

## 🚀 Quick Start

### Flight Search Agent

```bash
cd flights-search-agent
cp .env.example .env.local
# Edit .env.local with AWS credentials
./start.sh
```

Visit: http://localhost:5000/agentcard

### Web Portal

```bash
cd web-portal
cp .env.example .env.local
# Edit .env.local with credentials
npm install
npm run dev
```

Visit: http://localhost:3000

## 🧪 Testing

### Test the A2A Agent

```bash
cd flights-search-agent
python test_agent.py
```

### Test with Example Client

```bash
cd flights-search-agent
python example_client.py
```

### Manual API Testing

```bash
# Get AgentCard
curl http://localhost:5000/agentcard | jq

# Search for flights
curl -X POST http://localhost:5000/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": "test-001",
      "role": "ROLE_USER",
      "parts": [{"text": "Find flights from NYC to London under $500"}]
    },
    "configuration": {"blocking": true}
  }' | jq
```

## 📊 Technology Stack

### Flight Search Agent
- **FastAPI**: Async web framework
- **Pydantic**: Data validation
- **AWS Bedrock**: Claude 3 Sonnet
- **boto3**: AWS SDK
- **httpx**: Async HTTP client

### Web Portal
- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **NextAuth.js**: Authentication
- **Tailwind CSS**: Styling
- **AWS Bedrock**: AI integration

## 🔧 Environment Setup

### Required Environment Variables

**Flight Search Agent** (`.env.local`):
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

**Web Portal** (`.env.local`):
```bash
KEYCLOAK_CLIENT_ID=your_client_id
KEYCLOAK_CLIENT_SECRET=your_secret
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
A2A_AGENT_URL=http://localhost:5000
```

## 🐳 Docker Support

### Flight Search Agent

```bash
cd flights-search-agent
docker-compose up
```

### Ports
- **A2A Agent**: 5000
- **MCP Server**: 8080
- **Web Portal**: 3000

## 📖 API Examples

### Python Client

```python
from example_client import A2AClient

client = A2AClient("http://localhost:5000")

# Get capabilities
card = await client.get_agentcard()

# Search flights
result = await client.send_message(
    text="Find flights from SF to Tokyo under $1000"
)

# Extract response
response = client.extract_agent_response(result['task'])
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:5000/message:send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: {
      message_id: crypto.randomUUID(),
      role: 'ROLE_USER',
      parts: [{ 
        text: 'Find flights from NYC to London',
        media_type: 'text/plain'
      }]
    }
  })
});

const { task } = await response.json();
```

## 🎓 Example Queries

The agent understands natural language:

- "Find me flights from New York to London under $500"
- "Show me cheap flights from LAX to JFK"
- "I need to fly from Boston to Seattle"
- "Search for flights from San Francisco to Tokyo"
- "What flights are available from Chicago to Miami under $300?"

## 📝 Project Status

- ✅ A2A Protocol Implementation
- ✅ MCP Server for Flight Data
- ✅ AWS Bedrock Integration
- ✅ Task Management
- ✅ Streaming Support
- ✅ AgentCard
- ✅ Web Portal (Basic)
- 🚧 Real Flight API Integration (Planned)
- 🚧 Flight Booking (Planned)
- 🚧 Multi-leg Flights (Planned)

## 🤝 Contributing

This is a demonstration project showcasing A2A protocol implementation, MCP integration, and AI agent patterns.

## 📜 License

MIT License

## 🔗 Resources

- [A2A Protocol Specification](https://github.com/a2aproject/A2A)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## 💡 Use Cases

1. **Agent-to-Agent Communication**: Demonstrate A2A protocol
2. **Travel Planning**: Automated flight search
3. **Integration Patterns**: MCP and A2A integration
4. **AI Agents**: Building intelligent agents
5. **Enterprise Auth**: Keycloak integration patterns

## 🆘 Support

- Check the [QUICKSTART guide](flights-search-agent/QUICKSTART.md)
- Review [IMPLEMENTATION_GUIDE](flights-search-agent/IMPLEMENTATION_GUIDE.md)
- Consult [TROUBLESHOOTING](flights-search-agent/README.md#troubleshooting)

---

**Ready to start?** 

👉 [Flight Search Agent Quick Start](flights-search-agent/QUICKSTART.md)  
👉 [Web Portal Setup](web-portal/SETUP.md)

✈️ Happy Flying!
