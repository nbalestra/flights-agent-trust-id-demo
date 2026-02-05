# Getting Started - EasyJetlag Project

## 🎯 Quick Start

### 1. Navigate to Web Portal

```bash
cd web-portal
```

### 2. Install Dependencies (if not done)

```bash
npm install
```

### 3. Configure Environment

```bash
# Ensure .env.local exists with your credentials
cat .env.local
```

Should contain:
```env
AWS_ACCESS_KEY_ID=your-iam-access-key
AWS_SECRET_ACCESS_KEY=your-iam-secret-key
AWS_REGION=us-east-2
BEDROCK_INTENT_AGENT_ID=NN0I5PKGOR
BEDROCK_INTENT_ALIAS_ID=YXQHYFUAIW
KEYCLOAK_CLIENT_ID=your-client-id
```

### 4. Stop Any Running Servers

If you get "port 3000 already in use":
```bash
# Find and stop existing Next.js server
lsof -ti:3000 | xargs kill -9
```

### 5. Start Development Server

```bash
npm run dev
```

### 6. Open Application

Visit [http://localhost:3000](http://localhost:3000)

## 📂 New Project Structure

```
flights-agent-trust-id-demo/
├── README.md              # Project overview
├── ARCHITECTURE.md        # Architecture documentation
├── REFACTOR_NOTES.md      # Refactoring details
├── GETTING_STARTED.md     # This file
│
└── web-portal/            # ⭐ Main application
    ├── app/              # Next.js App Router
    ├── components/       # React components
    ├── contexts/         # React contexts
    ├── lib/              # Core libraries
    ├── types/            # TypeScript types
    ├── package.json      # Dependencies
    └── *.md             # Documentation
```

## ✅ What Changed

All application files moved to `web-portal/` directory:
- Clean monorepo structure
- Ready for additional components
- Organized and scalable

## 🔧 Working Directory

**Always work from `web-portal/` directory:**

```bash
# Development
cd web-portal
npm run dev

# Build
cd web-portal
npm run build

# Type check
cd web-portal
npm run type-check

# Lint
cd web-portal
npm run lint
```

## 📋 Verification Steps

1. ✅ Files moved to `web-portal/`
2. ✅ Git repository intact at root
3. ✅ Documentation updated
4. ⏳ Test application runs

## 🧪 Test the Application

### 1. Stop existing servers
```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9
```

### 2. Start fresh
```bash
cd web-portal
npm run dev
```

### 3. Test functionality
- [ ] Login page loads
- [ ] Keycloak authentication works
- [ ] Chat interface appears
- [ ] Debug pane visible on right
- [ ] Send test message
- [ ] Intent detection works

## 📖 Documentation

### Root Level
- [README.md](./README.md) - Project overview
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture details
- [REFACTOR_NOTES.md](./REFACTOR_NOTES.md) - Refactor information

### Web Portal
- [web-portal/README.md](./web-portal/README.md) - Web portal overview
- [web-portal/QUICKSTART.md](./web-portal/QUICKSTART.md) - Quick start
- [web-portal/SETUP.md](./web-portal/SETUP.md) - Detailed setup
- [web-portal/AWS_IAM_SETUP.md](./web-portal/AWS_IAM_SETUP.md) - AWS setup
- [web-portal/BEDROCK_INTEGRATION.md](./web-portal/BEDROCK_INTEGRATION.md) - Bedrock
- [web-portal/DEBUG_PANE.md](./web-portal/DEBUG_PANE.md) - Debug pane

## 🚨 Troubleshooting

### Port Already in Use

**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**:
```bash
lsof -ti:3000 | xargs kill -9
# Or use a different port
cd web-portal
PORT=3001 npm run dev
```

### Module Not Found

**Error**: `Cannot find module ...`

**Solution**:
```bash
cd web-portal
rm -rf node_modules package-lock.json
npm install
```

### Environment Variables Not Loading

**Error**: Undefined environment variables

**Solution**:
```bash
cd web-portal
# Verify .env.local exists
cat .env.local

# Restart server after adding/changing env vars
npm run dev
```

### TypeScript Errors

**Solution**:
```bash
cd web-portal
npm run type-check
```

## 🎯 Next Steps

1. **Provide AWS IAM Credentials**
   - Access Key ID
   - Secret Access Key
   - Update `web-portal/.env.local`

2. **Test Intent Detection**
   - Login to the application
   - Send search query: "What flights to Paris?"
   - Send booking query: "Book me a flight"
   - Watch debug pane for intent detection

3. **Configure A2A Agents** (when ready)
   - Add booking agent URL
   - Add search agent URL
   - Test end-to-end flow

## 📞 Support

- **Web Portal Issues**: See `web-portal/README.md`
- **AWS Setup**: See `web-portal/AWS_IAM_SETUP.md`
- **General Questions**: See `ARCHITECTURE.md`

---

**Ready!** Navigate to `web-portal` and start developing. 🚀
