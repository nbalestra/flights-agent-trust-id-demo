"""
A2A Protocol server application using the official A2A Python SDK.

This wraps the LangChain agent with the A2A protocol for agent-to-agent communication.
Uses JSON-RPC protocol with a single /agent endpoint.
"""
import logging

from a2a.server.apps.jsonrpc import A2AFastAPIApplication
from a2a.types import AgentCard

from agent.config import settings
from agent.a2a_server import get_request_handler, get_agent_executor_instance

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Log startup info
logger.info(f"Starting {settings.app_name} (A2A Protocol)...")
logger.info(f"Environment: {settings.environment}")
logger.info(f"AWS Region: {settings.aws_region}")
logger.info(f"Bedrock Model: {settings.bedrock_model_id}")
logger.info(f"MCP Enabled: {settings.mcp_enabled}")

# Global variables for lazy initialization
_request_handler = None
_agent_executor = None
_agent_card = None


def get_components():
    """Get or create A2A components (lazy initialization)."""
    global _request_handler, _agent_executor, _agent_card
    
    if _request_handler is None:
        _request_handler = get_request_handler()
        _agent_executor = get_agent_executor_instance()
        logger.info("A2A components initialized successfully")
    
    return _request_handler, _agent_executor




# Get components first
request_handler, agent_executor = get_components()

# Get full AgentCard with skills (now synchronous, no event loop issues)
agent_card = agent_executor.get_agentcard()
logger.info(f"AgentCard loaded with {len(agent_card.skills)} skill(s)")

# Log the skills for debugging
for skill in agent_card.skills:
    logger.info(f"  - Skill: {skill.name} ({skill.description})")

# Create A2A JSON-RPC FastAPI application
# This provides a single /agent endpoint that handles all requests
# Requests specify the operation type via the "method" field (e.g., "message/send")
a2a_jsonrpc_app = A2AFastAPIApplication(
    agent_card=agent_card,
    http_handler=request_handler,
)

# Build the actual FastAPI application
# All requests go to /agent endpoint with JSON-RPC format
app = a2a_jsonrpc_app.build(
    agent_card_url="/.well-known/agent-card.json",
    rpc_url="/agent"  # Single endpoint for all operations
)

logger.info("A2A JSON-RPC FastAPI application built successfully")
logger.info("A2A JSON-RPC endpoint:")
logger.info(f"  - POST /agent (All operations via JSON-RPC)")
logger.info(f"  - GET  /.well-known/agent-card.json (AgentCard with {len(agent_card.skills)} skills)")
logger.info("")
logger.info("Supported JSON-RPC methods:")
logger.info("  - message/send       (Send message)")
logger.info("  - message/stream     (Stream message)")
logger.info("  - tasks/get          (Get task)")
logger.info("  - tasks/cancel       (Cancel task)")
logger.info("  - tasks/list         (List tasks)")

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "agent.a2a_main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level=settings.log_level.lower()
    )
