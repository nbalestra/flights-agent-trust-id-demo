# EasyJetlag - Flights Agent Trust ID Demo

Multi-component application for EasyJetlag airline with AI-powered intent detection and agent routing.

## 📁 Project Structure

```
flights-agent-trust-id-demo/
├── web-portal/          # Next.js web application
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── contexts/       # React contexts (Debug, etc.)
│   ├── lib/            # Core libraries (Bedrock, A2A)
│   ├── types/          # TypeScript type definitions
│   ├── public/         # Static assets
│   └── *.md           # Documentation
└── .git/               # Git repository

```

## 🚀 Quick Start

### Web Portal

```bash
cd web-portal
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

All documentation is in the `web-portal` directory:

- **[web-portal/README.md](./web-portal/README.md)** - Complete web portal documentation
- **[web-portal/QUICKSTART.md](./web-portal/QUICKSTART.md)** - Quick start guide
- **[web-portal/SETUP.md](./web-portal/SETUP.md)** - Detailed setup instructions
- **[web-portal/AWS_IAM_SETUP.md](./web-portal/AWS_IAM_SETUP.md)** - AWS IAM configuration
- **[web-portal/BEDROCK_INTEGRATION.md](./web-portal/BEDROCK_INTEGRATION.md)** - Bedrock agent integration
- **[web-portal/A2A_INTEGRATION.md](./web-portal/A2A_INTEGRATION.md)** - A2A agent integration
- **[web-portal/DEBUG_PANE.md](./web-portal/DEBUG_PANE.md)** - Debug pane usage
- **[web-portal/KEYCLOAK_PUBLIC_CLIENT.md](./web-portal/KEYCLOAK_PUBLIC_CLIENT.md)** - Keycloak setup

## 🏗️ Components

### Web Portal
- **Framework**: Next.js 14 + React 18 + TypeScript
- **Authentication**: Keycloak (OIDC)
- **AI**: AWS Bedrock Agent Runtime (intent detection)
- **Styling**: Tailwind CSS
- **Deployment**: Heroku-ready

### Features
- 🔐 Secure Keycloak authentication
- 🤖 AI-powered intent detection (SEARCHING vs BOOKING)
- 💬 Real-time chat interface
- 🔍 Multi-agent routing (Search/Booking agents)
- 🐛 Built-in debug pane
- 📱 Responsive design
- ♿ Accessible components

## 🔧 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **AWS Bedrock** - Intent detection AI
- **Keycloak** - Authentication provider
- **Tailwind CSS** - Utility-first styling
- **A2A Protocol** - Agent-to-agent communication

## 📦 Repository Structure

This is a monorepo structure ready for expansion with additional components:

```
├── web-portal/     # Customer-facing web application
├── (future)        # Additional services can be added here
│   ├── api-gateway/
│   ├── booking-agent/
│   ├── search-agent/
│   └── ...
```

## 🚀 Development

Each component has its own README with specific instructions:

```bash
# Web Portal
cd web-portal
npm install
npm run dev
```

## 📝 License

Private and Confidential - EasyJetlag Airlines

## 🆘 Support

For component-specific issues, see the README in each component directory.

---

**Start with**: `cd web-portal && npm install && npm run dev`
