# EasyJetlag - AI Travel Assistant

A modern Next.js application for EasyJetlag airline with Keycloak authentication and A2A agent integration.

## Features

- 🔐 **Secure Authentication** - Keycloak/OpenID Connect integration
- 💬 **AI Chat Interface** - Real-time chat with A2A agent
- 🎨 **Modern UI/UX** - EasyJet-inspired branding with Tailwind CSS
- 🚀 **Production Ready** - Optimized for Heroku deployment
- 📱 **Responsive Design** - Works on all devices
- ♿ **Accessible** - WCAG compliant components

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js + Keycloak
- **AI/ML**: AWS Bedrock Agent Runtime (SDK v3 + IAM credentials)
- **Deployment**: Heroku
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm 9+
- A Keycloak instance with client credentials
- (Optional) A2A agent endpoint

## Getting Started

> **Note:** This application uses a **public** Keycloak client (no client secret required). See [KEYCLOAK_PUBLIC_CLIENT.md](./KEYCLOAK_PUBLIC_CLIENT.md) for detailed configuration.

### 1. Clone and Install

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# Keycloak Configuration (Public Client)
KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
KEYCLOAK_CLIENT_ID=your-client-id
# No client secret needed for public clients

# A2A Agent Configuration (optional for now)
A2A_AGENT_URL=https://your-agent-url.com
A2A_AGENT_ID=your-agent-id
```

**Generate a secure NEXTAUTH_SECRET:**

```bash
openssl rand -base64 32
```

### 3. Keycloak Setup

1. Log into your Keycloak admin console
2. Select the `maf` realm (or your realm)
3. Create a new client:
   - **Client ID**: Choose a unique ID (e.g., `easyjetlag-app`)
   - **Client Protocol**: openid-connect
   - **Access Type**: public (no client secret required)
   - **Valid Redirect URIs**: 
     - Development: `http://localhost:3000/*`
     - Production: `https://your-app.herokuapp.com/*`
   - **Web Origins**: `+` (allows all valid redirect URIs)
4. Update your `.env.local` with the Client ID (no secret needed for public clients)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## A2A Agent Integration

The application is structured to communicate with an A2A (Agent-to-Agent) protocol-compliant agent. 

### Current State

The A2A client (`lib/a2a-client.ts`) includes:
- Complete A2A message payload structure
- Mock responses for testing (remove when connecting real agent)
- Conversation management
- Error handling

### Connecting Your A2A Agent

When your A2A agent is ready:

1. Update environment variables:
```env
A2A_AGENT_URL=https://your-agent-endpoint.com
A2A_AGENT_ID=your-agent-id
```

2. In `lib/a2a-client.ts`, uncomment the real API call section and remove the mock response section:

```typescript
// Uncomment this section:
const response = await fetch(this.agentUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(a2aMessage),
});

// Remove the mock response section
```

### A2A Message Structure

The application sends messages in this format:

```typescript
{
  id: "unique-message-id",
  type: "request",
  timestamp: "2024-01-01T00:00:00.000Z",
  payload: {
    content: "User message here",
    data: { /* optional context */ }
  },
  metadata: {
    conversationId: "conversation-id",
    userId: "user@example.com"
  }
}
```

Expected response format:

```typescript
{
  id: "response-id",
  type: "response",
  timestamp: "2024-01-01T00:00:00.000Z",
  payload: {
    content: "Agent response here",
    data: { /* optional data */ }
  },
  metadata: {
    conversationId: "conversation-id"
  }
}
```

## Deployment to Heroku

### 1. Install Heroku CLI

```bash
# macOS
brew tap heroku/brew && brew install heroku

# Or download from https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
heroku create easyjetlag-app
# or use: heroku create (for auto-generated name)
```

### 4. Set Environment Variables

```bash
heroku config:set NEXTAUTH_URL=https://your-app.herokuapp.com
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)
heroku config:set KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
heroku config:set KEYCLOAK_CLIENT_ID=your-client-id
# No KEYCLOAK_CLIENT_SECRET needed for public clients
heroku config:set NODE_ENV=production
```

### 5. Update Keycloak Redirect URIs

Add your Heroku URL to Keycloak:
- Valid Redirect URIs: `https://your-app.herokuapp.com/*`
- Web Origins: `https://your-app.herokuapp.com`

### 6. Deploy

```bash
git add .
git commit -m "Initial commit"
git push heroku main
```

### 7. Open Your App

```bash
heroku open
```

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/    # NextAuth API routes
│   │   └── chat/                  # Chat API endpoint
│   ├── auth/
│   │   └── error/                 # Auth error page
│   ├── chat/                      # Chat interface
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home/Login page
│   └── providers.tsx              # Client providers
├── lib/
│   ├── a2a-client.ts             # A2A agent client
│   └── auth.ts                   # NextAuth configuration
├── types/
│   └── index.ts                  # TypeScript types
├── public/                       # Static assets
├── .env.example                  # Example environment variables
├── next.config.js               # Next.js configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── Procfile                     # Heroku process file
└── package.json                 # Dependencies
```

## Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
```

## Architecture Decisions

### Authentication Flow
- **NextAuth.js** with Keycloak provider for secure OAuth/OIDC flow
- JWT session strategy for scalability
- Access tokens stored in session for API calls

### UI/UX Best Practices
- Mobile-first responsive design
- Keyboard navigation support
- Loading states and error handling
- Optimistic UI updates
- Smooth animations and transitions

### A2A Communication
- Centralized A2A client with singleton pattern
- Type-safe message payloads
- Conversation state management
- Graceful error handling and retries

### Security
- Environment variables for sensitive data
- CSRF protection via NextAuth
- Secure session management
- No exposed API keys in client code

## Troubleshooting

### "Invalid redirect URI" error
- Ensure your Keycloak client has the correct redirect URIs configured
- Check that NEXTAUTH_URL matches your deployment URL

### Authentication loops
- Verify NEXTAUTH_SECRET is set and consistent
- Clear browser cookies and try again
- Check Keycloak client is set to "public" access type
- Check Keycloak realm and client configuration

### Chat not working
- Check browser console for errors
- Verify the `/api/chat` endpoint is accessible
- Ensure you're authenticated before accessing chat

### Heroku deployment issues
- Run `heroku logs --tail` to see real-time logs
- Verify all environment variables are set
- Ensure Node.js version in package.json matches Heroku

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Private and Confidential - EasyJetlag Airlines

## Support

For issues and questions:
- Check the troubleshooting section
- Review Heroku logs: `heroku logs --tail`
- Contact the development team

---

Built with ❤️ for EasyJetlag Airlines
