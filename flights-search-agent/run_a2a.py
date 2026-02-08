#!/usr/bin/env python3
"""
Entry point to run the Flight Search Agent with A2A Protocol support.
"""
import uvicorn
from agent.config import settings

if __name__ == "__main__":
    print("=" * 80)
    print("Starting Flight Search Agent - A2A Protocol Server (JSON-RPC)")
    print("=" * 80)
    print()
    print(f"Server: http://{settings.host}:{settings.port}")
    print(f"AgentCard: http://localhost:{settings.port}/.well-known/agent-card.json")
    print(f"Docs: http://localhost:{settings.port}/docs")
    print()
    print("A2A JSON-RPC Endpoint:")
    print(f"  POST /agent  (All operations)")
    print()
    print("Available Methods:")
    print('  - "method": "message/send"    (Send message)')
    print('  - "method": "message/stream"  (Stream message)')
    print('  - "method": "tasks/get"       (Get task)')
    print('  - "method": "tasks/cancel"    (Cancel task)')
    print('  - "method": "tasks/list"      (List tasks)')
    print()
    print("Example Request:")
    print('  POST /agent')
    print('  {"jsonrpc": "2.0", "id": "1", "method": "message/send", "params": {...}}')
    print()
    print("=" * 80)
    print()
    
    uvicorn.run(
        "agent.a2a_main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.is_development,
        log_level=settings.log_level.lower()
    )
