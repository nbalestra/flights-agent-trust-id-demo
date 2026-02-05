# AWS IAM Setup for Bedrock Agent

This guide explains how to set up AWS IAM credentials to use with the Bedrock Agent.

## Overview

The application now uses **AWS SDK v3** with **IAM credentials** (Access Key ID + Secret Access Key) to authenticate with AWS Bedrock Agent Runtime.

## Prerequisites

- AWS Account with access to Amazon Bedrock
- Bedrock Agent already created and deployed
- IAM permissions to create users and policies

## Step 1: Create IAM Policy

Create a policy that grants access to invoke your Bedrock agent:

1. Go to **AWS Console → IAM → Policies**
2. Click **Create Policy**
3. Choose **JSON** tab and paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeAgent"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-2:*:agent/NN0I5PKGOR",
        "arn:aws:bedrock:us-east-2:*:agent-alias/NN0I5PKGOR/YXQHYFUAIW"
      ]
    }
  ]
}
```

**Note**: Replace:
- `us-east-2` with your region
- `NN0I5PKGOR` with your agent ID
- `YXQHYFUAIW` with your alias ID

4. Click **Next: Tags** (optional)
5. Click **Next: Review**
6. Name it: `BedrockAgentInvokePolicy`
7. Click **Create Policy**

## Step 2: Create IAM User

Create a dedicated IAM user for the application:

1. Go to **AWS Console → IAM → Users**
2. Click **Add User**
3. User name: `easyjetlag-app-bedrock`
4. Select **Access key - Programmatic access**
5. Click **Next: Permissions**
6. Choose **Attach existing policies directly**
7. Search for and select: `BedrockAgentInvokePolicy`
8. Click **Next: Tags** (optional)
9. Click **Next: Review**
10. Click **Create User**

## Step 3: Save Credentials

**Important**: You'll only see the secret access key once!

1. Copy the **Access Key ID**
2. Copy the **Secret Access Key**
3. Store them securely (password manager recommended)

Example:
```
Access Key ID: AKIAIOSFODNN7EXAMPLE
Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 4: Configure Application

Update your `.env.local` file:

```env
# AWS IAM Credentials for Bedrock
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-2

# Bedrock Intent Agent Configuration
BEDROCK_INTENT_AGENT_ID=NN0I5PKGOR
BEDROCK_INTENT_ALIAS_ID=YXQHYFUAIW
```

## Step 5: Test

Restart your development server:

```bash
npm run dev
```

Try sending a message in the chat. Check the console logs:

```
[Bedrock] Client initialized: {
  region: 'us-east-2',
  agentId: 'NN0I5PKGOR',
  aliasId: 'YXQHYFUAIW',
  credentialsConfigured: true
}
[Bedrock] Invoking agent: { ... }
[Bedrock] Agent invoked successfully
[Bedrock] Detected intent: SEARCHING
```

## Security Best Practices

### ✅ DO:
- Use dedicated IAM user with minimal permissions
- Store credentials in environment variables
- Never commit `.env.local` to git
- Rotate credentials periodically
- Use different credentials for dev/prod

### ❌ DON'T:
- Use root account credentials
- Grant overly broad permissions
- Commit credentials to version control
- Share credentials between applications
- Hardcode credentials in source code

## IAM Policy Explained

```json
{
  "Effect": "Allow",          // Grant access
  "Action": [
    "bedrock:InvokeAgent"     // Only invoke agent action
  ],
  "Resource": [
    "arn:aws:bedrock:us-east-2:*:agent/NN0I5PKGOR",              // Agent ARN
    "arn:aws:bedrock:us-east-2:*:agent-alias/NN0I5PKGOR/YXQHYFUAIW"  // Alias ARN
  ]
}
```

This follows the **principle of least privilege** - only grants the minimum permissions needed.

## Troubleshooting

### Error: "Access Denied"

**Cause**: IAM user doesn't have permission to invoke the agent

**Solution**:
1. Verify the policy is attached to the user
2. Check the ARNs in the policy match your agent
3. Ensure the agent ID and alias ID are correct

### Error: "Credentials not found"

**Cause**: Environment variables not loaded

**Solution**:
1. Verify `.env.local` exists and has correct values
2. Restart the dev server
3. Check for typos in variable names

### Error: "Invalid credentials"

**Cause**: Access key ID or secret access key is incorrect

**Solution**:
1. Verify credentials in AWS Console
2. Generate new credentials if needed
3. Update `.env.local`

### Error: "Agent not found"

**Cause**: Agent ID or Alias ID is incorrect, or wrong region

**Solution**:
1. Verify agent ID: `NN0I5PKGOR`
2. Verify alias ID: `YXQHYFUAIW`
3. Verify region: `us-east-2`
4. Check agent exists in AWS Console → Bedrock → Agents

## Production Deployment

For Heroku or other platforms, set environment variables:

```bash
# Heroku example
heroku config:set AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
heroku config:set AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
heroku config:set AWS_REGION=us-east-2
heroku config:set BEDROCK_INTENT_AGENT_ID=NN0I5PKGOR
heroku config:set BEDROCK_INTENT_ALIAS_ID=YXQHYFUAIW
```

## Credential Rotation

Rotate credentials every 90 days:

1. Create new access key in IAM
2. Update application configuration
3. Test thoroughly
4. Delete old access key
5. Update all deployments

## Summary

✅ **What you need:**
- IAM user with Bedrock agent invoke permission
- Access Key ID
- Secret Access Key
- Agent ID and Alias ID

✅ **What you get:**
- Secure AWS SDK authentication
- Proper IAM permissions
- Audit trail in CloudTrail
- Production-ready setup

---

**Ready to use!** The application now properly authenticates with AWS using IAM credentials. 🚀
