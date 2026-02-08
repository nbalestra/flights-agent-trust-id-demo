"""
Flight Search Agent Package

A LangChain-based AI agent for flight search using AWS Bedrock.
Accessible via A2A Protocol for agent-to-agent communication.
"""
from agent.config import settings
from agent.agent_core import FlightSearchAgent, get_agent
from agent.a2a_server import (
    FlightSearchAgentExecutor,
    get_request_handler,
    get_agent_executor_instance
)

__version__ = "1.0.0"

__all__ = [
    "settings",
    "FlightSearchAgent",
    "get_agent",
    "FlightSearchAgentExecutor",
    "get_request_handler",
    "get_agent_executor_instance",
]
