# Flight Search A2A Agent - Project Summary

## Overview

A complete Python-based implementation of an A2A (Agent-to-Agent) protocol compliant agent for flight searches. This project demonstrates how to build a fully functional agent that can interact with other agents using the standardized A2A protocol.

## ✨ Key Features

- **Full A2A Protocol Compliance**: Implements the complete A2A v1.0 specification
- **AgentCard Support**: Self-describing agent manifest with capabilities and skills
- **MCP Integration**: Uses Model Context Protocol for flight data retrieval
- **Natural Language Processing**: Powered by AWS Bedrock (Claude 3 Sonnet)
- **RESTful API**: HTTP+JSON protocol binding
- **Streaming Support**: Real-time streaming responses
- **Task Management**: Complete task lifecycle handling
- **Async Architecture**: High-performance async I/O

## 📁 Project Structure

```
flights-search-agent/
├── main.py                    # A2A agent server (FastAPI)
├── mcp_server.py             # MCP server for flight data
├── a2a_models.py             # A2A protocol data models
├── agentcard.py              # AgentCard generator
├── bedrock_client.py         # AWS Bedrock integration
├── mcp_client.py             # MCP client
├── task_manager.py           # Task lifecycle management
├── test_agent.py             # Comprehensive test suite
├── example_client.py         # Example A2A client
├── start.sh                  # Startup script
├── requirements.txt          # Python dependencies
├── Dockerfile                # Docker container
├── docker-compose.yml        # Multi-container setup
├── .env.example              # Environment template
├── README.md                 # Main documentation
├── QUICKSTART.md             # Quick start guide
└── IMPLEMENTATION_GUIDE.md   # Detailed implementation guide
```

## 🚀 Quick Start

1. **Setup Environment**:
```bash
cd flights-search-agent
cp .env.example .env.local
# Edit .env.local with your AWS credentials
```

2. **Install Dependencies**:
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Start the Agent**:
```bash
./start.sh
```

4. **Test It**:
```bash
python test_agent.py
```

## 🔌 API Endpoints

### A2A Protocol Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/agentcard` | Get agent capabilities |
| POST | `/message:send` | Send message to agent |
| POST | `/message:stream` | Send with streaming |
| GET | `/tasks/{id}` | Get task status |
| GET | `/tasks` | List all tasks |
| POST | `/tasks/{id}:cancel` | Cancel a task |
| GET | `/health` | Health check |

### MCP Server Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mcp/tools` | List available tools |
| POST | `/tools/search_flights` | Search for flights |
| GET | `/tools/get_flight/{id}` | Get flight details |

## 💡 Usage Examples

### Using curl

```bash
# Get AgentCard
curl http://localhost:5000/agentcard

# Search for flights
curl -X POST http://localhost:5000/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": "msg-001",
      "role": "ROLE_USER",
      "parts": [{
        "text": "Find flights from NYC to London under $500"
      }]
    },
    "configuration": {"blocking": true}
  }'
```

### Using Python Client

```python
from example_client import A2AClient

client = A2AClient("http://localhost:5000")

# Get agent card
card = await client.get_agentcard()

# Search for flights
result = await client.send_message(
    text="Find me flights from San Francisco to Tokyo",
    blocking=True
)

# Extract response
response = client.extract_agent_response(result['task'])
print(response)
```

## 🎯 Agent Capabilities

The agent exposes three main skills:

### 1. Flight Search
Search for flights based on origin, destination, and budget:
- Natural language query understanding
- Budget filtering
- Real-time results
- Multiple airlines
- Detailed flight information

### 2. Flight Details
Get comprehensive information about specific flights:
- Departure/arrival times
- Aircraft type
- Layover information
- Baggage allowance
- Seat availability

### 3. Budget Analysis
Analyze and compare flight options:
- Price comparisons
- Best value recommendations
- Budget optimization
- Date flexibility analysis

## 🔧 Technology Stack

- **FastAPI**: Modern async web framework
- **Pydantic**: Data validation and serialization
- **AWS Bedrock**: Claude 3 Sonnet for NLP
- **httpx**: Async HTTP client
- **boto3**: AWS SDK for Python
- **uvicorn**: ASGI server

## 📊 A2A Protocol Features Implemented

✅ SendMessage (blocking and non-blocking)  
✅ SendStreamingMessage  
✅ GetTask  
✅ ListTasks  
✅ CancelTask  
✅ AgentCard  
✅ Task lifecycle management  
✅ Message history  
✅ Artifacts  
✅ Context grouping  
✅ Multi-turn conversations  
✅ Error handling  

## 🏗️ Architecture Highlights

1. **Modular Design**: Clear separation of concerns
2. **Async Operations**: Non-blocking I/O throughout
3. **Type Safety**: Pydantic models for all data
4. **Error Handling**: Comprehensive error management
5. **Extensible**: Easy to add new skills and features
6. **Testable**: Complete test coverage
7. **Production Ready**: Docker support, health checks, logging

## 🔐 Security Features

- Environment-based configuration
- Input validation via Pydantic
- CORS configuration
- Health check endpoints
- Structured logging
- Error sanitization

## 📈 Performance

- Async I/O for concurrent requests
- Connection pooling
- Efficient task storage
- Minimal latency
- Streaming support for large responses

## 🎨 Example Queries

The agent understands natural language:

```
"Find me flights from New York to London under $500"
"Show me cheap flights from LAX to JFK"
"I need to fly from Boston to Seattle, what's available?"
"Search for flights from San Francisco to Tokyo"
"What flights are available from Chicago to Miami under $300?"
```

## 🚢 Deployment Options

### Local Development
```bash
./start.sh
```

### Docker
```bash
docker-compose up
```

### Production
- Use environment variables
- Enable HTTPS
- Add authentication
- Implement rate limiting
- Set up monitoring

## 📝 Environment Variables

Required:
- `AWS_REGION` - AWS region for Bedrock
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key

Optional:
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 5000)
- `MCP_SERVER_URL` - MCP server URL
- `BEDROCK_MODEL_ID` - Bedrock model ID

## 🧪 Testing

### Run Test Suite
```bash
python test_agent.py
```

### Run Examples
```bash
python example_client.py
```

### Manual Testing
```bash
# Health check
curl http://localhost:5000/health

# Get AgentCard
curl http://localhost:5000/agentcard | jq

# Search flights
curl -X POST http://localhost:5000/message:send \
  -H "Content-Type: application/json" \
  -d @test_message.json | jq
```

## 📚 Documentation

- **README.md** - Main documentation
- **QUICKSTART.md** - 5-minute setup guide
- **IMPLEMENTATION_GUIDE.md** - Detailed technical guide
- **A2A Specification** - [GitHub](https://github.com/a2aproject/A2A)

## 🔮 Future Enhancements

1. Real flight API integration
2. Flight booking capability
3. Multi-leg flight support
4. Price alerts and monitoring
5. Calendar search for best dates
6. Loyalty program integration
7. Seat selection with visual maps
8. Push notifications
9. Multi-tenant support
10. Analytics dashboard

## 🤝 Integration Guide

To integrate this agent with your system:

1. **Discover Capabilities**: `GET /agentcard`
2. **Send Messages**: `POST /message:send`
3. **Track Tasks**: `GET /tasks/{id}`
4. **Handle Responses**: Parse task history and artifacts
5. **Manage Context**: Use context_id for conversations

See `example_client.py` for complete integration examples.

## 🐛 Troubleshooting

**Agent won't start**:
- Check ports 5000 and 8080 are available
- Verify AWS credentials in `.env.local`
- Review logs for errors

**No flights found**:
- Ensure MCP server is running
- Check `MCP_ENABLED=true`
- Review MCP server logs

**Connection errors**:
- Verify both services are running
- Check firewall settings
- Confirm URLs in configuration

## 📜 License

MIT License

## 🙏 Acknowledgments

- A2A Protocol Team
- AWS Bedrock
- FastAPI Community
- MCP Protocol

## 📞 Support

For issues or questions:
1. Check the documentation
2. Review logs and error messages
3. Consult the implementation guide
4. Refer to A2A specification

---

**Ready to fly?** ✈️ Start with the [QUICKSTART.md](flights-search-agent/QUICKSTART.md) guide!
