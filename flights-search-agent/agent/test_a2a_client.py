#!/usr/bin/env python3
"""
Test client for the A2A Protocol Flight Search Agent.
"""
import asyncio
import httpx
import json
from datetime import datetime


BASE_URL = "http://localhost:5000"


async def test_a2a_protocol():
    """Test the A2A protocol endpoints."""
    
    print("=" * 80)
    print("A2A Protocol Test Client")
    print("=" * 80)
    print()
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        
        # Test 1: Get AgentCard
        print("Test 1: Get AgentCard")
        print("-" * 80)
        try:
            response = await client.get(f"{BASE_URL}/.well-known/agent.json")
            if response.status_code == 200:
                agentcard = response.json()
                print(f"✅ AgentCard retrieved successfully")
                print(f"   Name: {agentcard['name']}")
                print(f"   Description: {agentcard['description']}")
                print(f"   Version: {agentcard['version']}")
                print(f"   Skills: {len(agentcard.get('skills', []))} skill(s)")
                
                if agentcard.get('skills'):
                    for skill in agentcard['skills']:
                        print(f"     - {skill['name']}: {skill['description']}")
                
                print(f"   Metadata: {agentcard.get('metadata', {})}")
                print()
            else:
                print(f"❌ Failed: {response.status_code} - {response.text}")
                print()
        except Exception as e:
            print(f"❌ Error: {e}")
            print()
        
        # Test 2: Send Message (A2A Protocol)
        print("Test 2: Send Message (A2A Protocol)")
        print("-" * 80)
        try:
            a2a_request = {
                "message": {
                    "message_id": f"test-{datetime.utcnow().timestamp()}",
                    "role": "ROLE_USER",
                    "parts": [
                        {
                            "text": "Find me flights from New York to London under $500",
                            "media_type": "text/plain"
                        }
                    ]
                },
                "configuration": {
                    "blocking": True
                }
            }
            
            print(f"Request: {json.dumps(a2a_request, indent=2)}")
            print()
            
            # JSON-RPC request format
            jsonrpc_request = {
                "jsonrpc": "2.0",
                "id": "test-1",
                "method": "message/send",
                "params": a2a_request
            }
            
            response = await client.post(
                f"{BASE_URL}/agent",
                json=jsonrpc_request
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Message sent successfully")
                print(f"   Task ID: {result['task']['task_id']}")
                print(f"   Task State: {result['task']['state']}")
                
                if result['task'].get('result'):
                    message = result['task']['result']
                    response_text = message['parts'][0]['text'] if message.get('parts') else "No response"
                    print(f"   Response: {response_text[:200]}...")
                
                print()
            else:
                print(f"❌ Failed: {response.status_code}")
                print(f"   Response: {response.text}")
                print()
        
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            print()
        
        # Test 3: Send Message with Context Group (Conversation)
        print("Test 3: Send Message with Context Group (Multi-turn)")
        print("-" * 80)
        try:
            context_group_id = f"conv-{datetime.utcnow().timestamp()}"
            
            # First message
            print("First message: Find flights from Boston to Seattle")
            a2a_request_1 = {
                "message": {
                    "message_id": f"msg-1-{datetime.utcnow().timestamp()}",
                    "role": "ROLE_USER",
                    "context_group_id": context_group_id,
                    "parts": [
                        {
                            "text": "Find flights from Boston to Seattle",
                            "media_type": "text/plain"
                        }
                    ]
                },
                "configuration": {
                    "blocking": True
                }
            }
            
            response_1 = await client.post(
                f"{BASE_URL}/message:send",
                json=a2a_request_1
            )
            
            if response_1.status_code == 200:
                result_1 = response_1.json()
                print(f"✅ First message processed")
                print(f"   Task ID: {result_1['task']['task_id']}")
                print()
                
                # Follow-up message (would use context)
                print("Follow-up message: What about under $400?")
                a2a_request_2 = {
                    "message": {
                        "message_id": f"msg-2-{datetime.utcnow().timestamp()}",
                        "role": "ROLE_USER",
                        "context_group_id": context_group_id,
                        "parts": [
                            {
                                "text": "What about under $400?",
                                "media_type": "text/plain"
                            }
                        ]
                    },
                    "configuration": {
                        "blocking": True
                    }
                }
                
                response_2 = await client.post(
                    f"{BASE_URL}/message:send",
                    json=a2a_request_2
                )
                
                if response_2.status_code == 200:
                    result_2 = response_2.json()
                    print(f"✅ Follow-up message processed")
                    print(f"   Task ID: {result_2['task']['task_id']}")
                    print()
                else:
                    print(f"❌ Failed: {response_2.status_code}")
                    print()
            else:
                print(f"❌ Failed: {response_1.status_code}")
                print()
        
        except Exception as e:
            print(f"❌ Error: {e}")
            print()
    
    print("=" * 80)
    print("A2A Protocol Tests Complete")
    print("=" * 80)


if __name__ == "__main__":
    print("\n🚀 Starting A2A Protocol Tests\n")
    print("Make sure the A2A server is running: python run_a2a.py")
    print()
    
    try:
        asyncio.run(test_a2a_protocol())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Test suite error: {e}")
        import traceback
        traceback.print_exc()
