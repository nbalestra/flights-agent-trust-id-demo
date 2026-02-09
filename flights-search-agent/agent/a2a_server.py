"""
A2A Protocol server implementation wrapping the LangChain agent.
"""
import logging
import uuid
from typing import Optional, List, AsyncIterator
from datetime import datetime

from a2a.types import (
    AgentCard,
    AgentSkill,
    Part,
    Message,
    Task,
    TaskState,
    TaskStatus,
    TaskStatusUpdateEvent,
    TaskArtifactUpdateEvent,
    SendMessageRequest,
    SendMessageResponse,
)
from a2a.server.agent_execution import AgentExecutor
from a2a.server.agent_execution.context import RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.utils import new_agent_text_message, new_task, new_text_artifact

from agent.agent_core import get_agent
from agent.config import settings

logger = logging.getLogger(__name__)


class FlightSearchAgentExecutor(AgentExecutor):
    """
    AgentExecutor implementation that wraps the LangChain agent.
    """

    # In-memory storage for chat histories keyed by context_id
    _chat_histories: dict[str, list[dict]] = {}

    def __init__(self):
        """Initialize the agent executor."""
        self.langchain_agent = get_agent()
        logger.info("AgentExecutor initialized with LangChain agent")
    
    async def execute(
        self,
        context: RequestContext,
        event_queue: EventQueue
    ) -> None:
        """
        Execute the agent for a given request and push events to the queue.
        
        Following the A2A samples pattern with TaskStatusUpdateEvent.
        """
        try:
            # Get the message and task from context
            message = context.message
            task = context.current_task
            
            if not message:
                raise Exception('No message provided')
            
            # Create task if it doesn't exist
            if not task:
                task = new_task(message)
                await event_queue.enqueue_event(task)
            
            # Extract text from message parts
            user_message = self._extract_text_from_parts(message.parts)
            logger.info(f"Executing agent for task {task.id}: {user_message[:100]}...")

            # Get context history using task.context_id
            context_id = task.context_id
            chat_history = await self._get_chat_history(context_id)

            # Store the user message in history
            self._store_chat_message(context_id, "user", user_message)

            # Process with LangChain agent
            result = await self.langchain_agent.chat(
                message=user_message,
                chat_history=chat_history
            )
            
            # Handle response
            if result.get("success"):
                raw_message = result["message"]
    
    # --- ADD THIS EXTRACTION LOGIC ---
                if isinstance(raw_message, list):
                   # Extract the 'text' value from the first item in the list if it's a dict
                   if len(raw_message) > 0 and isinstance(raw_message[0], dict):
                    response_text = raw_message[0].get("text", str(raw_message))
                   else:
                    response_text = str(raw_message)
                else:
                    response_text = raw_message
    # ---------------------------------
                logger.info(f"Agent response ready: {response_text[:100]}...")

                # Store the assistant response in history
                self._store_chat_message(context_id, "assistant", response_text)

                # Detect if the agent is asking for more information
                is_asking_questions = self._is_asking_for_input(response_text)
                
                if is_asking_questions:
                    # Agent needs more input - return input_required state
                    logger.info("Agent is requesting more information - returning input_required state")
                    
                    await event_queue.enqueue_event(
                        TaskStatusUpdateEvent(
                            status=TaskStatus(
                                state=TaskState.input_required,
                                message=new_agent_text_message(
                                    response_text,
                                    task.context_id,
                                    task.id,
                                ),
                            ),
                            final=True,
                            context_id=task.context_id,
                            task_id=task.id,
                        )
                    )
                else:
                    # Agent has complete answer - return completed state
                    logger.info("Agent has complete answer - returning completed state")
                    
                    # First send the result as an artifact
                    await event_queue.enqueue_event(
                        TaskArtifactUpdateEvent(
                            append=False,
                            context_id=task.context_id,
                            task_id=task.id,
                            last_chunk=True,
                            artifact=new_text_artifact(
                                name='flight_search_result',
                                description='Flight search results',
                                text=response_text,
                            ),
                        )
                    )
                    
                    # Then send completed status
                    await event_queue.enqueue_event(
                        TaskStatusUpdateEvent(
                            status=TaskStatus(state=TaskState.completed),
                            final=True,
                            context_id=task.context_id,
                            task_id=task.id,
                        )
                    )
            else:
                # Handle error
                error_text = result.get("error", "Unknown error occurred")
                logger.error(f"Agent returned error: {error_text}")
                
                await event_queue.enqueue_event(
                    TaskStatusUpdateEvent(
                        status=TaskStatus(
                            state=TaskState.failed,
                            message=new_agent_text_message(
                                f"Error: {error_text}",
                                task.context_id,
                                task.id,
                            ),
                        ),
                        final=True,
                        context_id=task.context_id,
                        task_id=task.id,
                    )
                )
        
        except Exception as e:
            logger.error(f"Exception in agent execution: {e}", exc_info=True)
            
            # Try to send error status if we have task info
            try:
                if context.current_task:
                    task = context.current_task
                    await event_queue.enqueue_event(
                        TaskStatusUpdateEvent(
                            status=TaskStatus(
                                state=TaskState.failed,
                                message=new_agent_text_message(
                                    f"Error: {str(e)}",
                                    task.context_id,
                                    task.id,
                                ),
                            ),
                            final=True,
                            context_id=task.context_id,
                            task_id=task.id,
                        )
                    )
            except Exception as queue_error:
                logger.error(f"Failed to enqueue error status: {queue_error}")
    
    async def cancel(
        self, 
        context: RequestContext, 
        event_queue: EventQueue
    ) -> None:
        """
        Cancel a running task.
        
        For our implementation, we don't support cancellation yet.
        """
        task = context.current_task
        if task:
            logger.warning(f"Task cancellation requested for {task.id} - not implemented")
        else:
            logger.warning("Task cancellation requested but no task found")
        
        # TODO: Implement task cancellation if needed
        # For now, just acknowledge the cancellation request
        pass
    
    def get_agentcard(self) -> AgentCard:
        """Return the AgentCard describing agent capabilities (synchronous)."""
        return AgentCard(
            name="Flight Search Agent",
            description="AI-powered flight search agent using LangChain and AWS Bedrock",
            url="https://a2a-flight-search-agent-21a3ba068989.herokuapp.com/agent",
            version="1.0.0",
            defaultInputModes=["STREAM"],  # Required field
            defaultOutputModes=["STREAM"],  # Required field
            skills=[
                AgentSkill(
                    id="search_flights",
                    name="search_flights",
                    description="Search for flights based on origin, destination, and budget",
                    tags=["flight", "search", "travel", "booking"],
                    input_schema={
                        "type": "object",
                        "properties": {
                            "origin": {
                                "type": "string",
                                "description": "Origin city or airport code (e.g., 'NYC', 'New York', 'JFK')"
                            },
                            "destination": {
                                "type": "string",
                                "description": "Destination city or airport code (e.g., 'London', 'LAX')"
                            },
                            "budget": {
                                "type": "number",
                                "description": "Maximum budget in USD (optional)"
                            }
                        },
                        "required": ["origin", "destination"]
                    },
                    output_schema={
                        "type": "object",
                        "properties": {
                            "flights": {
                                "type": "array",
                                "description": "List of available flights"
                            },
                            "flights_found": {
                                "type": "integer",
                                "description": "Number of flights found"
                            }
                        }
                    }
                )
            ],
            capabilities={
                "streaming": False,
                "context_grouping": True,
                "natural_language": True
            },
            authentication={
                "type": "none"  # No auth for demo purposes
            },
            metadata={
                "llm_provider": "aws_bedrock",
                "llm_model": settings.bedrock_model_id,
                "framework": "langchain",
                "mcp_enabled": settings.mcp_enabled
            }
        )
    
    def _is_asking_for_input(self, response_text: str) -> bool:
        """
        Detect if the agent's response is asking for more information.
        
        Returns True if the response contains questions or requests for clarification.
        """
        # Indicators that the agent needs more input
        asking_indicators = [
            "could you please provide",
            "please provide",
            "i need to know",
            "can you tell me",
            "could you specify",
            "which city",
            "where are you",
            "what is your",
            "more details",
            "need more information",
            "?",  # Contains question marks
        ]
        
        if isinstance(response_text, list):
            # Extract content from LangChain message objects if necessary
            response_text = " ".join([
              m.content if hasattr(m, 'content') else str(m) 
              for m in response_text
            ])
        else:
            response_text = response_text
        
        response_lower = response_text.lower()
        
        # Check if response contains question indicators
        has_question_mark = "?" in response_text
        has_asking_phrase = any(indicator in response_lower for indicator in asking_indicators)
        
        # Check if response is asking for origin, destination, or budget
        is_asking_flight_details = any(keyword in response_lower for keyword in [
            "departure city",
            "arrival city",
            "origin",
            "destination",
            "budget"
        ]) and has_question_mark
        
        result = has_asking_phrase and has_question_mark
        
        if result:
            logger.info(f"Detected input request in response (has questions)")
        
        return result
    
    def _extract_text_from_parts(self, parts: List[Part]) -> str:
        """Extract text content from message parts."""
        text_parts = []
        
        for part in parts:
            # Part is a Pydantic model, access data via model_dump()
            part_data = part.model_dump() if hasattr(part, 'model_dump') else part
            
            # Check if it's a text part and extract the text
            if isinstance(part_data, dict):
                kind = part_data.get('kind', '')
                if kind == 'text' and 'text' in part_data:
                    text_parts.append(part_data['text'])
                    logger.debug(f"Extracted text: '{part_data['text'][:100]}'")
            elif hasattr(part, 'text') and part.text:
                text_parts.append(part.text)
        
        extracted_text = " ".join(text_parts)
        
        if not extracted_text:
            logger.warning(f"No text extracted from {len(parts)} parts!")
            logger.warning(f"Parts data: {[p.model_dump() if hasattr(p, 'model_dump') else p for p in parts]}")
        else:
            logger.info(f"Extracted message text: '{extracted_text[:100]}...'")
            
        return extracted_text
    
    async def _get_chat_history(self, context_id: str) -> Optional[List[dict]]:
        """
        Retrieve chat history for a context.

        Uses in-memory storage to maintain conversation context.
        """
        history = self._chat_histories.get(context_id)
        if history:
            logger.debug(f"Retrieved {len(history)} messages for context {context_id}")
        else:
            logger.debug(f"No history found for context {context_id}")
        return history

    def _store_chat_message(self, context_id: str, role: str, content: str) -> None:
        """
        Store a chat message in the history for a context.

        Args:
            context_id: The context identifier
            role: 'user' or 'assistant'
            content: The message content
        """
        if context_id not in self._chat_histories:
            self._chat_histories[context_id] = []

        self._chat_histories[context_id].append({
            "role": role,
            "content": content
        })
        logger.debug(f"Stored {role} message for context {context_id}, total messages: {len(self._chat_histories[context_id])}")


# Create A2A components
def create_a2a_components():
    """Create and configure A2A server components."""
    
    # Create agent executor
    agent_executor = FlightSearchAgentExecutor()
    
    # Create task store
    task_store = InMemoryTaskStore()
    
    # Create request handler
    request_handler = DefaultRequestHandler(
        agent_executor=agent_executor,
        task_store=task_store,
    )
    
    logger.info("A2A components created successfully")
    return request_handler, agent_executor


# Global instances
_request_handler: Optional[DefaultRequestHandler] = None
_agent_executor: Optional[FlightSearchAgentExecutor] = None


def get_request_handler() -> DefaultRequestHandler:
    """Get or create the global request handler instance."""
    global _request_handler, _agent_executor
    if _request_handler is None:
        _request_handler, _agent_executor = create_a2a_components()
    return _request_handler


def get_agent_executor_instance() -> FlightSearchAgentExecutor:
    """Get or create the global agent executor instance."""
    global _request_handler, _agent_executor
    if _agent_executor is None:
        _request_handler, _agent_executor = create_a2a_components()
    return _agent_executor
