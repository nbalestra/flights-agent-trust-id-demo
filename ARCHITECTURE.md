# Architecture Overview

## Project Structure

This repository follows a **monorepo structure** to organize all Jetlag Airlines components in a single repository.

```
flights-agent-trust-id-demo/
├── README.md                    # Root documentation
├── ARCHITECTURE.md              # This file
├── .git/                        # Git repository
├── .gitignore                   # Global git ignore rules
├── .vscode/                     # VS Code workspace settings
│
└── web-portal/                  # Next.js web application
    ├── app/                     # Next.js 14 App Router
    │   ├── api/                 # API routes
    │   │   ├── auth/            # NextAuth endpoints
    │   │   └── chat/            # Chat API with Bedrock + A2A
    │   ├── chat/                # Chat interface page
    │   ├── auth/                # Auth error pages
    │   ├── layout.tsx           # Root layout
    │   ├── page.tsx             # Home/login page
    │   ├── providers.tsx        # Client providers
    │   └── globals.css          # Global styles
    │
    ├── components/              # React components
    │   └── DebugPane.tsx        # Debug console component
    │
    ├── contexts/                # React contexts
    │   └── DebugContext.tsx     # Debug logging state
    │
    ├── lib/                     # Core libraries
    │   ├── auth.ts              # NextAuth + Keycloak config
    │   ├── bedrock-client.ts    # AWS Bedrock intent detection
    │   └── a2a-client.ts        # A2A agent communication
    │
    ├── types/                   # TypeScript definitions
    │   └── index.ts             # Shared types
    │
    ├── public/                  # Static assets
    │   └── robots.txt
    │
    ├── middleware.ts            # Next.js middleware (route protection)
    ├── next.config.js           # Next.js configuration
    ├── tailwind.config.js       # Tailwind CSS configuration
    ├── tsconfig.json            # TypeScript configuration
    ├── package.json             # Dependencies
    ├── .env.local               # Environment variables (not in git)
    ├── .env.example             # Environment template
    │
    └── *.md                     # Documentation files
```

## Component: Web Portal

### Technology Stack

**Framework & Language:**
- Next.js 14 (App Router)
- React 18
- TypeScript 5.3

**Styling:**
- Tailwind CSS
- Custom EasyJet branding

**Authentication:**
- NextAuth.js 4.24
- Keycloak (OIDC provider)
- Public client (no secret)

**AI & Agent:**
- AWS Bedrock Agent Runtime
- IAM authentication
- Intent detection (SEARCHING vs BOOKING)

**Deployment:**
- Heroku
- Standalone output mode
- Process file included

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Portal (Next.js)                      │
│                                                                   │
│  ┌──────────────┐      ┌─────────────┐      ┌───────────────┐  │
│  │              │      │             │      │               │  │
│  │  Frontend    │─────▶│   API       │─────▶│  Bedrock      │  │
│  │  (React)     │      │   Routes    │      │  Intent Agent │  │
│  │              │      │             │      │               │  │
│  └──────────────┘      └─────────────┘      └───────────────┘  │
│                              │                                   │
│                              │ Routes based on intent            │
│                              ▼                                   │
│                    ┌──────────────────┐                         │
│                    │  A2A Clients     │                         │
│                    │  ┌──────┬──────┐ │                         │
│                    │  │Search│Book  │ │                         │
│                    │  │Agent │Agent │ │                         │
│                    │  └──────┴──────┘ │                         │
│                    └──────────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  External        │
                    │  A2A Agents      │
                    │  (Future)        │
                    └──────────────────┘
```

### Data Flow

#### 1. Authentication Flow

```
User → Login Page → Keycloak (OIDC) → Callback → Session Created → Chat Page
```

#### 2. Chat Message Flow

```
User Message
    ↓
API Route (/api/chat)
    ↓
Validate Session (NextAuth)
    ↓
AWS Bedrock Agent (Intent Detection)
    ↓
Detected Intent: SEARCHING or BOOKING
    ↓
Route to Appropriate A2A Agent
    ├─ SEARCHING → Search Agent
    └─ BOOKING → Booking Agent
    ↓
Agent Response
    ↓
Display to User + Debug Log
```

### Key Features

**1. Intent Detection**
- AWS Bedrock agent analyzes user query
- Returns: SEARCHING or BOOKING
- Fallback to SEARCHING if ambiguous

**2. Agent Routing**
- Search Agent: Handles flight search queries
- Booking Agent: Handles booking/reservation queries
- A2A protocol for agent communication

**3. Debug Pane**
- Real-time action logging
- Tracks: login, searches, bookings, errors
- Expandable detail view
- Collapsible sidebar

**4. Authentication**
- Keycloak public client
- PKCE flow for security
- Session-based state management

## Future Expansion

The monorepo structure allows for easy addition of new components:

```
flights-agent-trust-id-demo/
├── web-portal/              # ✅ Implemented
├── booking-agent/           # 🔮 Future: Booking microservice
├── search-agent/            # 🔮 Future: Search microservice
├── api-gateway/             # 🔮 Future: API gateway
├── admin-portal/            # 🔮 Future: Admin interface
└── mobile-app/              # 🔮 Future: Mobile application
```

### Planned Components

**Booking Agent** (Future)
- Microservice for flight booking
- A2A protocol server
- Integration with booking systems

**Search Agent** (Future)
- Microservice for flight search
- A2A protocol server
- Integration with flight databases

**API Gateway** (Future)
- Centralized API management
- Rate limiting
- Authentication proxy

## Development Workflow

### Getting Started

```bash
# Clone repository
git clone <repo-url>
cd flights-agent-trust-id-demo

# Setup web portal
cd web-portal
npm install
cp .env.example .env.local
# Edit .env.local with your credentials
npm run dev
```

### Adding New Components

```bash
# Create new component directory
mkdir booking-agent
cd booking-agent
npm init -y

# Add to root README
# Add to this ARCHITECTURE.md
```

### Shared Code

For shared code between components:
- Create `/shared` directory
- Use npm workspaces or lerna
- Publish internal packages

## Environment Variables

### Web Portal

See `web-portal/.env.example` for all required variables:

- `NEXTAUTH_*` - NextAuth configuration
- `KEYCLOAK_*` - Keycloak authentication
- `AWS_*` - AWS Bedrock credentials
- `BEDROCK_*` - Bedrock agent configuration
- `A2A_*` - A2A agent endpoints

## Security Considerations

### Authentication
- Keycloak for user authentication
- NextAuth session management
- Protected API routes via middleware

### AWS Credentials
- IAM credentials in environment variables
- Never committed to git
- Rotate periodically (90 days)

### Data Privacy
- No PII in logs
- Debug pane doesn't expose sensitive data
- HTTPS enforced in production

## Deployment

### Web Portal
- **Platform**: Heroku
- **Process**: `web: npm start`
- **Build**: `npm run build`
- **Environment**: Set via Heroku config vars

### Future Components
- Containerize with Docker
- Deploy to Kubernetes/ECS
- Use infrastructure as code (Terraform)

## Monitoring & Logging

### Current
- Console logs (development)
- Debug pane (development)
- Heroku logs (production)

### Future
- Centralized logging (CloudWatch, DataDog)
- Application metrics
- Error tracking (Sentry)
- Performance monitoring

## Testing Strategy

### Current
- Manual testing via debug pane
- TypeScript type checking
- ESLint for code quality

### Future
- Unit tests (Jest)
- Integration tests (Playwright)
- E2E tests (Cypress)
- Load testing (k6)

## CI/CD Pipeline

### Future Pipeline

```
Code Push
    ↓
Linting & Type Check
    ↓
Unit Tests
    ↓
Build
    ↓
Integration Tests
    ↓
Deploy to Staging
    ↓
E2E Tests
    ↓
Deploy to Production
```

## Documentation

All component-specific documentation lives within each component directory.

### Web Portal Documentation
- `README.md` - Overview and quick start
- `SETUP.md` - Detailed setup guide
- `AWS_IAM_SETUP.md` - AWS configuration
- `BEDROCK_INTEGRATION.md` - Bedrock integration
- `A2A_INTEGRATION.md` - A2A protocol details
- `DEBUG_PANE.md` - Debug pane usage
- `KEYCLOAK_PUBLIC_CLIENT.md` - Keycloak setup

## Version Control

### Git Workflow
- Main branch: `main`
- Feature branches: `feature/<name>`
- Hotfix branches: `hotfix/<name>`

### Commit Conventions
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code refactoring
- `style:` - Formatting
- `test:` - Adding tests
- `chore:` - Maintenance

## Summary

This architecture provides:
- ✅ Organized monorepo structure
- ✅ Scalable for future components
- ✅ Clear separation of concerns
- ✅ Comprehensive documentation
- ✅ Production-ready web portal

---

**Status**: Web portal implemented and functional. Ready for expansion with additional components.
