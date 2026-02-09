# Heroku Quick Deploy (2 Minutes)

## Prerequisites

- Heroku CLI installed
- AWS Bedrock credentials

## Deploy Now

```bash
cd flights-search-agent

# 1. Login to Heroku
heroku login

# 2. Create app
heroku create my-flight-agent

# 3. Set environment variables (one command)
heroku config:set \
  AWS_REGION=us-east-2 \
  AWS_ACCESS_KEY_ID=your_key_here \
  AWS_SECRET_ACCESS_KEY=your_secret_here \
  BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0 \
  ENVIRONMENT=production \
  LOG_LEVEL=INFO

# 4. Deploy
git init
git add .
git commit -m "Deploy A2A flight agent"
git push heroku main
```

## Test It

```bash
# Get your URL
heroku info | grep "Web URL"

# Test AgentCard
curl https://my-flight-agent.herokuapp.com/.well-known/agent-card.json

# Test message
curl -X POST https://my-flight-agent.herokuapp.com/agent \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "message/send",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Find flights from NYC to LON"}],
        "messageId": "test-001"
      }
    }
  }'
```

## Monitor

```bash
# View logs
heroku logs --tail

# Check status
heroku ps
```

## That's It!

Your agent is live at: `https://your-app-name.herokuapp.com`

**Deployed in 2 minutes!** 🚀

## Next Steps

- Add custom domain
- Enable auto-scaling
- Add monitoring
- Set up CI/CD

See [HEROKU_DEPLOY.md](HEROKU_DEPLOY.md) for complete guide.
