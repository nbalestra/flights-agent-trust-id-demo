"""
LangChain agent implementation for flight search using AWS Bedrock.
"""
import logging
from typing import Dict, Any, Optional, List
import json
import boto3

from langchain_aws import ChatBedrock
 
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from agent.config import settings
from agent.mcp_tools import MCPClient

logger = logging.getLogger(__name__)


class FlightSearchAgent:
    """
    LangChain agent for flight search using AWS Bedrock and MCP tools.
    """
    
    def __init__(self):
        """Initialize the flight search agent."""
        self.mcp_client = MCPClient(
            server_url=settings.mcp_server_url,
            enabled=settings.mcp_enabled
        )
        self.llm = self._create_llm()
        self.tools = self._create_tools()
        self.agent_executor = self._create_agent()
        logger.info("Flight Search Agent initialized successfully")
    
    def _create_llm(self) -> ChatBedrock:
        """Create and configure AWS Bedrock LLM."""
        logger.info(f"Initializing AWS Bedrock with model: {settings.bedrock_model_id}")
        logger.info(f"AWS Region: {settings.aws_region}")
        
        # Log credential status (without exposing actual keys)
        if settings.aws_access_key_id:
            logger.info(f"Using AWS Access Key: {settings.aws_access_key_id[:4]}...{settings.aws_access_key_id[-4:]}")
        else:
            logger.warning("No AWS_ACCESS_KEY_ID found in settings")
        
        try:
            # Create LangChain ChatBedrock with Converse API
            # Credentials are already set in environment by config.py
            llm = ChatBedrock(
                credentials_profile_name=None,
                region_name=settings.aws_region,
                model_id=settings.bedrock_model_id,
                model_kwargs={
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "max_tokens": 4096,
                },
                # Use Converse API for proper message formatting
                beta_use_converse_api=True,
            )
            
            logger.info("AWS Bedrock LLM initialized successfully with Converse API")
            logger.info(f"Using beta_use_converse_api=True for proper message formatting")
            return llm
        except Exception as e:
            logger.error(f"Failed to initialize AWS Bedrock: {e}")
            raise
    
    def _create_tools(self) -> List:
        """Create LangChain tools for the agent."""
        
        mcp_client = self.mcp_client
        
        @tool
        async def search_flights(origin: str, destination: str, budget: float = None) -> str:
            """Search for flights based on origin, destination, and budget.
            
            Args:
                origin: The origin city or airport code (e.g., 'NYC', 'New York', 'JFK')
                destination: The destination city or airport code (e.g., 'London', 'LAX')
                budget: Maximum budget in USD (optional)
                
            Returns:
                A JSON string with flight search results including available flights, prices, times, and airlines.
            """
            try:
                # Call MCP client
                result = await mcp_client.search_flights(
                    origin=origin,
                    destination=destination,
                    budget=budget
                )
                
                return json.dumps(result, indent=2)
                
            except Exception as e:
                logger.error(f"Error in flight search tool: {e}")
                return json.dumps({
                    "success": False,
                    "error": str(e)
                })
        
        tools = [search_flights]
        
        logger.info(f"Created {len(tools)} tools for agent")
        return tools
    
    def _create_agent(self) -> AgentExecutor:
        """Create the LangChain agent executor."""
        
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            (
                "system",
                """You are a helpful flight search assistant. Your job is to help users find flights based on their preferences.

You have access to a flight search tool that can search for flights given:
- origin: The departure city or airport
- destination: The arrival city or airport  
- budget: The maximum price in USD (optional)

When a user asks about flights, extract the origin, destination, and budget (if mentioned) from their query, 
then use the search_flights tool to find available flights.

Present the results in a clear, user-friendly format. If multiple flights are found, highlight the best options 
based on price, duration, or other relevant factors.

If the user's request is unclear, ask for clarification before searching."""
            ),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent
        agent = create_tool_calling_agent(
            llm=self.llm,
            tools=self.tools,
            prompt=prompt
        )
        
        # Create agent executor
        agent_executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            handle_parsing_errors=True,
            max_iterations=5,
            return_intermediate_steps=False
        )
        
        logger.info("Agent executor created successfully")
        return agent_executor
    
    async def chat(
        self,
        message: str,
        chat_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message from the user.
        
        Args:
            message: User's message
            chat_history: Optional list of previous messages
            
        Returns:
            Dictionary containing the agent's response
        """
        try:
            logger.info(f"Processing chat message: {message[:100]}...")
            
            # Convert chat history to LangChain message format
            lc_history = []
            if chat_history:
                for msg in chat_history:
                    role = msg.get("role", "user")
                    content = msg.get("content", "")
                    if role == "user":
                        lc_history.append(HumanMessage(content=content))
                    elif role == "assistant":
                        lc_history.append(AIMessage(content=content))
            
            # Invoke agent
            result = await self.agent_executor.ainvoke({
                "input": message,
                "chat_history": lc_history
            })
            
            response = {
                "success": True,
                "message": result.get("output", ""),
                "agent_type": "langchain",
                "model": settings.bedrock_model_id
            }
            
            logger.info("Chat message processed successfully")
            return response
            
        except Exception as e:
            logger.error(f"Error processing chat message: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "message": "I apologize, but I encountered an error processing your request. Please try again."
            }


# Global agent instance
_agent_instance: Optional[FlightSearchAgent] = None


def get_agent() -> FlightSearchAgent:
    """Get or create the global agent instance."""
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = FlightSearchAgent()
    return _agent_instance
