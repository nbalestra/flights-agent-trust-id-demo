# Token Debugging Guide

## Overview

The debug pane now shows complete access token information when you log in. If you're not seeing it, follow this guide to troubleshoot.

## What to Check

### 1. Check Browser Console

Open your browser's developer console (F12) and look for these logs:

**After login, you should see:**
```
[Login] Session received: {
  hasAccessToken: true,
  accessTokenLength: 1234,
  sessionKeys: ['user', 'expires', 'accessToken']
}

[Login] Decoding access token...
[Login] Token payload: { sub: '...', iss: '...', ... }
[Login] Formatted token: { ... }

[NextAuth Session] Creating session with token: {
  hasAccessToken: true,
  hasIdToken: true,
  hasRefreshToken: true
}
```

**If you see:**
```
[Login] No access token in session!
[Login] Full session object: { user: {...}, expires: '...' }
```

This means the token is not being passed from NextAuth to the client session.

### 2. Check Debug Pane

In the debug pane, click on the login entry and look for:

**Session Info:**
- Has Access Token: ✅ Yes / ❌ No
- Has ID Token: ✅ Yes / ❌ No
- Has Refresh Token: ✅ Yes / ❌ No

**If Access Token shows ❌ No:**
- The token is not in the session
- Continue to troubleshooting below

**If Access Token shows ✅ Yes:**
- Scroll down in the debug log
- You should see "Access Token" section with:
  - Subject, Issuer, Issued/Expires times, Scopes
  - "View Full Decoded Token" (expandable)
  - "View Raw Token" (expandable)

### 3. Check Raw Session Object

In the debug pane login entry, click:
**"View Raw Session Object"**

This shows the complete session object. Look for:
```json
{
  "user": {
    "name": "...",
    "email": "..."
  },
  "expires": "...",
  "accessToken": "eyJhbGciOiJSUzI1NiIs..."  // ← Should be here
}
```

## Troubleshooting

### Issue: Access Token Not in Session

**Cause:** NextAuth might not be receiving the token from Keycloak

**Solutions:**

#### Solution 1: Check Keycloak Client Configuration

In Keycloak Admin Console:
1. Go to your client (e.g., `easyjetlag-app`)
2. Settings tab:
   - ✅ Standard Flow Enabled: ON
   - ✅ Direct Access Grants Enabled: ON
3. Client Scopes tab:
   - Verify `openid`, `email`, `profile` are in Default Client Scopes
4. Save and try logging in again

#### Solution 2: Verify Environment Variables

Check `web-portal/.env.local`:
```env
KEYCLOAK_ISSUER=https://lemur-8.cloud-iam.com/auth/realms/maf
KEYCLOAK_CLIENT_ID=your-client-id
NEXTAUTH_SECRET=<should-be-set>
NEXTAUTH_URL=http://localhost:3000
```

#### Solution 3: Clear Session and Re-login

```bash
# Clear browser data
# Or use incognito/private window
# Then login again
```

#### Solution 4: Check NextAuth Logs

In your terminal where you run `npm run dev`, look for:
```
[NextAuth JWT] Account received: {
  hasAccessToken: true,  // ← Should be true
  hasIdToken: true,
  ...
}
```

If `hasAccessToken: false`, Keycloak is not returning the token.

### Issue: Token Decoding Fails

**Cause:** Token format is invalid or not a JWT

**Check Console:**
```
Error decoding JWT: ...
```

**Solution:**
- Verify token format: should have 3 parts (header.payload.signature)
- Check if it's actually a JWT token
- Log the raw token to see its format

### Issue: Debug Pane Shows "No access token available"

**Causes:**
1. Token not in session (see Solution 1-4 above)
2. Public client might not return tokens by default

**For Public Clients:**

Update Keycloak client:
1. Go to Settings
2. **Implicit Flow Enabled**: OFF (keep OFF)
3. **Standard Flow Enabled**: ON
4. Client Authenticator: None (for public clients)

Or try using a **confidential** client with a secret:

```env
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

Update Keycloak:
- Access Type: confidential
- Generate and copy the secret from Credentials tab

## Testing Steps

### 1. Restart Server
```bash
cd web-portal
npm run dev
```

### 2. Open Browser Console
Press F12 to open developer tools

### 3. Clear Session
- Clear cookies
- Or use incognito window

### 4. Login
- Click "Sign In with Keycloak"
- Complete authentication
- Watch console logs

### 5. Check Debug Pane
- Right side of screen
- Click on "User logged in successfully"
- Look for Session Info and Access Token sections

### 6. Verify Console Output

You should see detailed logs showing:
- Account received with tokens
- JWT callback
- Session callback
- Token decoding
- Final session object

## Expected Output

### In Browser Console:
```
[NextAuth JWT] Account received: { hasAccessToken: true, ... }
[NextAuth JWT] Token state: { hasAccessToken: true, ... }
[NextAuth Session] Creating session with token: { hasAccessToken: true, ... }
[NextAuth Session] Session created: { hasAccessToken: true, ... }
[Login] Session received: { hasAccessToken: true, accessTokenLength: 1234, ... }
[Login] Decoding access token...
[Login] Token payload: { sub: '...', iss: '...', exp: ..., ... }
[Login] Formatted token: { ..., exp_readable: '2/5/2026, 10:35:00 PM', ... }
```

### In Debug Pane:
```
🔐 User logged in successfully

User:
  Name: John Doe
  Email: john.doe@example.com

Provider: Keycloak

Session Info:
  Has Access Token: ✅ Yes
  Has ID Token: ✅ Yes
  Has Refresh Token: ✅ Yes

Access Token:
  Subject: a1b2c3d4-...
  Issuer: https://lemur-8.cloud-iam.com/auth/realms/maf
  Issued: 2/5/2026, 10:30:00 PM
  Expires: 2/5/2026, 10:35:00 PM
  Scopes: openid email profile

  ▶ View Full Decoded Token
  ▶ View Raw Token
  ▶ View Raw Session Object
```

## Common Issues

### 1. Public Client + No Token

**Problem:** Public clients might not return access tokens

**Solution:** Use confidential client with secret, or check Keycloak settings

### 2. Token Expired

**Problem:** Token shows but is expired immediately

**Check:** Token lifetime in Keycloak (Realm Settings → Tokens)

### 3. Missing Claims

**Problem:** Token missing expected claims (email, name, etc.)

**Solution:** Check Client Scopes and Protocol Mappers in Keycloak

## Need Help?

If you still don't see the token:

1. **Share console logs** - Copy the `[NextAuth]` and `[Login]` logs
2. **Share debug pane content** - What does Session Info show?
3. **Share Keycloak config** - Client settings (don't share secrets!)
4. **Try confidential client** - Use client secret instead of public

## Quick Fix to Try

If nothing works, try switching to a confidential client:

### 1. In Keycloak:
- Set Access Type to `confidential`
- Copy client secret from Credentials tab

### 2. In .env.local:
```env
KEYCLOAK_CLIENT_SECRET=your-copied-secret
```

### 3. Restart server and test

This often resolves token availability issues!

---

**Current Status:** Enhanced logging added. Login and check console + debug pane for detailed token information.
