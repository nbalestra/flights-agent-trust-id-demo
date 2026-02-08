# Quick Start - A2A Flight Search Agent

Get your A2A-compliant flight search agent running in 5 minutes!

## Prerequisites

- Python 3.9+
- AWS account with Bedrock access
- AWS credentials

## Step-by-Step

### 1. Install

```bash
cd flights-search-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```bash
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
BEDROCK_MODEL_ID=your model
```

### 3. Enable Claude in AWS

1. Go to [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Click "Model access"
3. Enable "Claude 3 Sonnet"

### 4. Start Server

```bash
python run_a2a.py
```

### 5. Test It!

```bash
# Get AgentCard
curl http://localhost:5000/.well-known/agent.json | jq

# Send message
curl -X POST http://localhost:5000/v1/message:send \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "message_id": "test-001",
      "role": "ROLE_USER",
      "parts": [
        {
          "text": "Find flights from NYC to London under $500",
          "media_type": "text/plain"
        }
      ]
    },
    "configuration": {"blocking": true}
  }' | jq
```

## That's It!

Your A2A-compliant flight search agent is running! 🎉

## Next Steps

- Run test suite: `python test_a2a_client.py`
- Read full docs: [README.md](README.md)
- Choose model: [MODEL_SELECTION.md](MODEL_SELECTION.md)

## Troubleshooting

### AWS Issues
```bash
python test_aws_credentials.py
```

### Configuration Issues
```bash
python verify_config.py
```

### Port Already in Use
Edit `.env.local`:
```bash
PORT=5001
```

---

**Start now:** `python run_a2a.py`
