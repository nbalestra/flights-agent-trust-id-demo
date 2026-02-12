# Jetlag Airlines Setup Guide

This guide will walk you through setting up the Jetlag Airlines application from scratch.

> **Important:** This application uses a **public** Keycloak client. No client secret is required! See [KEYCLOAK_PUBLIC_CLIENT.md](./KEYCLOAK_PUBLIC_CLIENT.md) for detailed information.

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Keycloak credentials:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=$(openssl rand -base64 32)  # Generate this
KEYCLOAK_CLIENT_ID=your-client-id-here
# KEYCLOAK_CLIENT_SECRET not needed (public client)
```

### 3. Run the App

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Detailed Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- A Keycloak instance with access to create clients

### Step 1: Keycloak Client Configuration

1. **Access Keycloak Admin Console**
   - Navigate to: [https://lemur-8.cloud-iam.com/auth/admin](https://lemur-8.cloud-iam.com/auth/admin)
   - Log in with your admin credentials

2. **Select the Realm**
   - Choose the `maf` realm from the dropdown

3. **Create a New Client**
   - Go to: Clients → Create
   - Fill in:
     - **Client ID**: `jetlag-app` (or your preferred name)
     - **Client Protocol**: `openid-connect`
   - Click Save

4. **Configure Client Settings**
   
   **Settings Tab:**
   - **Access Type**: `public` (no client secret required)
   - **Standard Flow Enabled**: ON
   - **Direct Access Grants Enabled**: ON
   - **Valid Redirect URIs**:
     ```
     http://localhost:3000/*
     http://localhost:3000/api/auth/callback/keycloak
     ```
   - **Web Origins**: `+` (or `http://localhost:3000`)
   - **Base URL**: `http://localhost:3000`
   - Click Save

5. **Note: No Client Secret Needed**
   - Public clients don't require a secret
   - This is the standard configuration for web applications using PKCE flow

6. **Configure Client Scopes (Optional)**
   - Go to **Client Scopes** tab
   - Ensure `openid`, `email`, and `profile` are in Default Client Scopes

### Step 2: Environment Configuration

Create `.env.local` in the project root:

```bash
# Generate a secure secret
openssl rand -base64 32
```

Use the output in your `.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste-the-generated-secret-here>

# Keycloak Configuration (Public Client)
KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
KEYCLOAK_CLIENT_ID=jetlag-app
# No client secret needed for public clients

# A2A Agent (Leave empty for now - will use mock responses)
A2A_AGENT_URL=
A2A_AGENT_ID=

# Environment
NODE_ENV=development
```

### Step 3: Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# In another terminal, check for TypeScript errors
npm run type-check

# Run linter
npm run lint
```

### Step 4: Test the Application

1. **Access the App**
   - Open [http://localhost:3000](http://localhost:3000)
   - You should see the Jetlag login page

2. **Test Login**
   - Click "Sign In with Keycloak"
   - You'll be redirected to Keycloak
   - Enter your credentials
   - After successful login, you'll be redirected to the chat interface

3. **Test Chat**
   - Type a message and press Enter
   - You should receive a response from the mock AI agent
   - Try quick action buttons

### Step 5: Verify Everything Works

**Checklist:**
- [ ] Login redirects to Keycloak
- [ ] Successful login redirects to /chat
- [ ] Chat interface loads
- [ ] Can send and receive messages
- [ ] Sign out returns to home page
- [ ] Protected routes redirect to login when not authenticated

---

## Production Deployment (Heroku)

### Prerequisites

- Heroku account
- Heroku CLI installed
- Git initialized in project

### Step 1: Prepare for Deployment

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"
```

### Step 2: Create Heroku App

```bash
# Login to Heroku
heroku login

# Create app
heroku create jetlag-app
# Note: Use a unique name or let Heroku generate one
```

### Step 3: Configure Heroku Environment

```bash
# Set all environment variables
heroku config:set NEXTAUTH_URL=https://jetlag-app.herokuapp.com
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)
heroku config:set KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
heroku config:set KEYCLOAK_CLIENT_ID=jetlag-app
# No KEYCLOAK_CLIENT_SECRET needed for public clients
heroku config:set NODE_ENV=production

# Verify configuration
heroku config
```

### Step 4: Update Keycloak for Production

In Keycloak admin console:

1. Go to your client settings
2. Verify **Access Type** is set to `public`
3. Add production URLs to **Valid Redirect URIs**:
   ```
   https://jetlag-app.herokuapp.com/*
   https://jetlag-app.herokuapp.com/api/auth/callback/keycloak
   ```
4. Add to **Web Origins**:
   ```
   https://jetlag-app.herokuapp.com
   ```
5. Update **Base URL**:
   ```
   https://jetlag-app.herokuapp.com
   ```
6. Click Save

### Step 5: Deploy

```bash
# Deploy to Heroku
git push heroku main

# If using a different branch
git push heroku your-branch:main

# Open the app
heroku open

# View logs
heroku logs --tail
```

### Step 6: Verify Production

1. Visit your Heroku URL
2. Test the complete authentication flow
3. Test the chat functionality
4. Check Heroku logs for any errors

---

## Connecting Your A2A Agent

When you're ready to connect a real A2A agent:

### 1. Update Environment Variables

```bash
# Local
# Add to .env.local
A2A_AGENT_URL=https://your-agent-endpoint.com
A2A_AGENT_ID=your-agent-id

# Production
heroku config:set A2A_AGENT_URL=https://your-agent-endpoint.com
heroku config:set A2A_AGENT_ID=your-agent-id
```

### 2. Update the A2A Client

Edit `lib/a2a-client.ts`:

Find the `sendMessage` method and:

1. **Comment out** the mock response section:
```typescript
// const response: A2AResponse = {
//   message: this.getMockResponse(request.message),
//   ...
// };
```

2. **Uncomment** the real API call section:
```typescript
const response = await fetch(this.agentUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(a2aMessage),
});

if (!response.ok) {
  throw new Error(`A2A request failed: ${response.statusText}`);
}

const responseData: A2AMessage = await response.json();

return {
  message: responseData.payload.content || '',
  conversationId: responseData.metadata?.conversationId || this.conversationId,
  data: responseData.payload.data,
};
```

3. **Deploy the changes**:
```bash
git add .
git commit -m "Connect real A2A agent"
git push heroku main
```

### 3. Test A2A Integration

1. Send test messages through the chat
2. Monitor logs: `heroku logs --tail`
3. Verify message format and responses
4. Check conversation continuity

---

## Troubleshooting

### Issue: "Invalid redirect URI"

**Solution:**
- Verify Keycloak redirect URIs match exactly
- Include both base URL and callback URL
- Check for typos in URLs
- Ensure protocol (http/https) matches

### Issue: "Configuration error"

**Solution:**
```bash
# Check all env vars are set
heroku config

# Verify locally
cat .env.local

# Regenerate NEXTAUTH_SECRET
openssl rand -base64 32
```

### Issue: Authentication loops

**Solution:**
- Clear browser cookies
- Check NEXTAUTH_SECRET is set
- Verify Keycloak client is set to "public"
- Check session settings in `lib/auth.ts`

### Issue: Chat API errors

**Solution:**
```bash
# Check logs
heroku logs --tail | grep error

# Verify authentication
# Make sure you're logged in before accessing /chat

# Check API route
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'
```

### Issue: Build failures on Heroku

**Solution:**
```bash
# Check Node version
node --version  # Should be 18+

# Clear build cache
heroku repo:purge_cache -a jetlag-app
git commit --allow-empty -m "Rebuild"
git push heroku main

# Check build logs
heroku logs --tail
```

---

## Development Tips

### Hot Reload
The app uses Next.js Fast Refresh - changes appear instantly.

### Type Checking
Run `npm run type-check` before committing to catch TypeScript errors.

### Debugging
- Use Chrome DevTools
- Check Next.js console output
- Monitor Network tab for API calls
- Use `console.log` in API routes (visible in terminal)

### Code Style
- The project uses ESLint with Next.js config
- Run `npm run lint` to check
- VS Code will show inline errors

---

## Next Steps

1. **Customize Branding**
   - Update colors in `tailwind.config.js`
   - Add your logo to `public/`
   - Modify metadata in `app/layout.tsx`

2. **Add Features**
   - Flight booking functionality
   - User profile page
   - Booking history
   - Notifications

3. **Enhance Security**
   - Add rate limiting
   - Implement CORS policies
   - Add request validation
   - Set up monitoring

4. **Optimize Performance**
   - Add caching
   - Optimize images
   - Implement CDN
   - Add analytics

---

## Support

- **Documentation**: See README.md
- **Logs**: `heroku logs --tail`
- **Keycloak Docs**: [Keycloak Documentation](https://www.keycloak.org/docs/latest/)
- **Next.js Docs**: [Next.js Documentation](https://nextjs.org/docs)

---

Happy coding! ✈️
