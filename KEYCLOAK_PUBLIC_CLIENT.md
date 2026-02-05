# Keycloak Public Client Configuration

This application uses a **public** Keycloak client, which means **no client secret is required**. This is the standard configuration for web applications using the PKCE (Proof Key for Code Exchange) flow.

## What is a Public Client?

- **Public clients** are applications that run in the browser and cannot securely store secrets
- They use PKCE flow for security instead of client secrets
- Examples: SPAs, mobile apps, Next.js applications
- More secure for client-side applications than trying to hide a secret

## Keycloak Configuration Steps

### 1. Create Client

In Keycloak Admin Console → Clients → Create:

```
Client ID: easyjetlag-app (or your preferred name)
Client Protocol: openid-connect
```

### 2. Configure Client Settings

**Settings Tab:**

```
Access Type: public ⭐ (This is the key setting!)
Standard Flow Enabled: ON
Direct Access Grants Enabled: ON (optional)
Implicit Flow Enabled: OFF (not needed)
```

**URLs (Development):**
```
Root URL: http://localhost:3000
Valid Redirect URIs: 
  - http://localhost:3000/*
  - http://localhost:3000/api/auth/callback/keycloak
Web Origins: +
Admin URL: http://localhost:3000
```

**URLs (Production):**
```
Root URL: https://your-app.herokuapp.com
Valid Redirect URIs:
  - https://your-app.herokuapp.com/*
  - https://your-app.herokuapp.com/api/auth/callback/keycloak
Web Origins: +
Admin URL: https://your-app.herokuapp.com
```

### 3. No Credentials Tab Needed

With **Access Type: public**, the Credentials tab won't show a secret. This is expected and correct!

## Environment Variables

Your `.env.local` file should look like this:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-generated-secret-here

# Keycloak Configuration (Public Client)
KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
KEYCLOAK_CLIENT_ID=your-client-id

# No KEYCLOAK_CLIENT_SECRET needed! ✅
```

## Security with Public Clients

### How is it secure without a secret?

1. **PKCE Flow**: Uses cryptographic challenge/verifier pairs
2. **State Parameter**: Prevents CSRF attacks
3. **Nonce**: Prevents replay attacks
4. **Redirect URI Validation**: Only configured URIs are allowed
5. **Short-lived Tokens**: Access tokens expire quickly

### What the application does:

```typescript
// lib/auth.ts
KeycloakProvider({
  clientId: process.env.KEYCLOAK_CLIENT_ID || '',
  clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '', // Empty for public
  issuer: process.env.KEYCLOAK_ISSUER,
  checks: process.env.KEYCLOAK_CLIENT_SECRET ? ['pkce', 'state'] : ['pkce'],
})
```

The application automatically:
- Uses PKCE when no client secret is provided
- Validates state parameter
- Handles token exchange securely

## Verification Checklist

Before testing, verify:

- [ ] Keycloak client **Access Type** is set to `public`
- [ ] Valid Redirect URIs include your app URL with `/*`
- [ ] Web Origins is set to `+` or your app URL
- [ ] KEYCLOAK_CLIENT_ID is set in `.env.local`
- [ ] KEYCLOAK_CLIENT_SECRET is NOT set (or empty)
- [ ] NEXTAUTH_SECRET is set and random
- [ ] NEXTAUTH_URL matches your app URL

## Testing

### 1. Start the app:
```bash
npm run dev
```

### 2. Visit http://localhost:3000

### 3. Click "Sign In with Keycloak"

### 4. You should be redirected to Keycloak login

### 5. After login, you should be redirected back to /chat

## Troubleshooting

### "Invalid client credentials" error

**Cause:** Client might still be set to "confidential"

**Fix:**
- Open Keycloak Admin Console
- Go to your client settings
- Change Access Type to `public`
- Save

### "Invalid redirect URI" error

**Cause:** Your redirect URI is not in the allowed list

**Fix:**
- Add `http://localhost:3000/*` to Valid Redirect URIs
- Add `http://localhost:3000/api/auth/callback/keycloak`
- Ensure no typos
- Save changes

### Authentication works but keeps redirecting

**Cause:** Possible NEXTAUTH_SECRET issue

**Fix:**
```bash
# Generate a new secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET=<paste-generated-secret>
```

### PKCE not working

**Cause:** Browser might not support required features

**Fix:**
- Use a modern browser (Chrome, Firefox, Safari, Edge)
- Check browser console for errors
- Clear browser cache and cookies

## Comparison: Public vs Confidential

| Feature | Public Client | Confidential Client |
|---------|--------------|---------------------|
| Client Secret | ❌ None | ✅ Required |
| Use Case | Web apps, SPAs | Server-to-server |
| Security | PKCE + State | Client Secret |
| Configuration | Simpler | More complex |
| Token Storage | Browser (secure) | Server only |

## Production Deployment

### Heroku Configuration

```bash
heroku config:set NEXTAUTH_URL=https://your-app.herokuapp.com
heroku config:set NEXTAUTH_SECRET=$(openssl rand -base64 32)
heroku config:set KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
heroku config:set KEYCLOAK_CLIENT_ID=your-client-id
# No KEYCLOAK_CLIENT_SECRET! ✅
heroku config:set NODE_ENV=production
```

### Update Keycloak for Production

Add production URLs to your Keycloak client:

```
Valid Redirect URIs:
  - https://your-app.herokuapp.com/*
  - https://your-app.herokuapp.com/api/auth/callback/keycloak

Web Origins:
  - https://your-app.herokuapp.com

Root URL:
  - https://your-app.herokuapp.com
```

## Additional Resources

- [Keycloak Client Configuration](https://www.keycloak.org/docs/latest/server_admin/#_clients)
- [PKCE Flow Explained](https://oauth.net/2/pkce/)
- [NextAuth.js Providers](https://next-auth.js.org/providers/keycloak)
- [OAuth 2.0 for Browser-Based Apps](https://oauth.net/2/browser-based-apps/)

## Quick Reference

**TL;DR:**
1. Set Keycloak client to **public**
2. Add your redirect URIs
3. Set KEYCLOAK_CLIENT_ID in `.env.local`
4. **Don't** set KEYCLOAK_CLIENT_SECRET
5. You're done! 🎉

---

**Having issues?** Check that your Keycloak client Access Type is set to `public` and that all redirect URIs are correctly configured.
