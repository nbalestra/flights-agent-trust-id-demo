# JWT Token Debugging

## Overview

The application now displays decoded access token contents in the debug pane when users log in.

## What's Displayed

When a user successfully logs in, the debug pane shows:

### 1. **Key Token Information**
- **Subject** (sub) - Unique user identifier
- **Issuer** (iss) - Token issuer (Keycloak URL)
- **Issued At** (iat) - When token was created (human-readable)
- **Expires At** (exp) - When token expires (human-readable)
- **Scopes** - Granted permissions (e.g., "openid email profile")
- **Audience** (aud) - Intended recipient

### 2. **Full Decoded Token** (Expandable)
Click "View Full Decoded Token" to see:
- All claims in the JWT payload
- Custom claims from Keycloak
- User attributes
- Session information

### 3. **Raw Token** (Expandable)
Click "View Raw Token" to see:
- The complete JWT string
- Useful for testing with external tools
- Can copy for debugging

## Example Debug Log Entry

```
🔐 User logged in successfully

User:
  Name: John Doe
  Email: john.doe@example.com

Provider: Keycloak

Access Token:
  Subject: a1b2c3d4-e5f6-7890-abcd-ef1234567890
  Issuer: https://lemur-8.cloud-iam.com/auth/realms/maf
  Issued: 2/5/2026, 10:30:00 PM
  Expires: 2/5/2026, 10:35:00 PM
  Scopes: openid email profile

  ▶ View Full Decoded Token
  ▶ View Raw Token
```

## JWT Structure

A JWT token has three parts separated by dots:

```
header.payload.signature
```

### Header
Contains token type and signing algorithm:
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id"
}
```

### Payload (Decoded in Debug Pane)
Contains claims about the user:
```json
{
  "sub": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "iss": "https://lemur-8.cloud-iam.com/auth/realms/maf",
  "aud": "easyjetlag-app",
  "exp": 1707176100,
  "iat": 1707175800,
  "auth_time": 1707175800,
  "azp": "easyjetlag-app",
  "scope": "openid email profile",
  "email": "john.doe@example.com",
  "email_verified": true,
  "name": "John Doe",
  "preferred_username": "john.doe",
  "given_name": "John",
  "family_name": "Doe"
}
```

### Signature
Cryptographic signature to verify token authenticity (not shown in debug pane).

## Token Claims Explained

### Standard Claims (OIDC)

| Claim | Description | Example |
|-------|-------------|---------|
| `sub` | Subject - unique user identifier | `a1b2c3d4-...` |
| `iss` | Issuer - who created the token | `https://lemur-8.cloud-iam.com/...` |
| `aud` | Audience - intended recipient | `easyjetlag-app` |
| `exp` | Expiration time (Unix timestamp) | `1707176100` |
| `iat` | Issued at time (Unix timestamp) | `1707175800` |
| `auth_time` | Authentication time | `1707175800` |
| `azp` | Authorized party | `easyjetlag-app` |
| `scope` | Granted scopes | `openid email profile` |

### User Claims

| Claim | Description |
|-------|-------------|
| `email` | User's email address |
| `email_verified` | Email verification status |
| `name` | Full name |
| `preferred_username` | Username |
| `given_name` | First name |
| `family_name` | Last name |

### Custom Claims

Keycloak can add custom claims:
- `roles` - User roles
- `groups` - User groups
- `realm_access` - Realm-level permissions
- `resource_access` - Client-level permissions

## Implementation

### JWT Utilities (`lib/jwt-utils.ts`)

```typescript
// Decode JWT payload
const payload = decodeJWT(token);

// Get formatted payload with readable dates
const formatted = formatJWTPayload(payload);

// Check if token is expired
const expired = isJWTExpired(token);

// Get expiration time
const expirationTime = getJWTExpiration(token);
```

### Login Flow

```typescript
// When user logs in (app/page.tsx)
useEffect(() => {
  if (session?.accessToken) {
    const tokenPayload = decodeJWT(session.accessToken);
    const formatted = formatJWTPayload(tokenPayload);
    
    addLog({
      action: 'User logged in successfully',
      type: 'login',
      details: {
        accessToken: {
          raw: session.accessToken,
          decoded: formatted,
          // ... key fields extracted
        }
      }
    });
  }
}, [session]);
```

### Debug Pane Display

The debug pane shows:
1. **Summary view** - Key fields (subject, issuer, expiry)
2. **Full decoded** - Expandable JSON view
3. **Raw token** - Expandable base64 JWT string

## Use Cases

### 1. **Verify User Identity**
Check the `sub` claim to see the unique user identifier from Keycloak.

### 2. **Debug Permissions**
Check `scope`, `roles`, and `resource_access` to verify user permissions.

### 3. **Token Expiration**
Monitor token expiration times to debug session issues.

### 4. **Testing**
Copy raw token to test API calls externally:
```bash
curl -H "Authorization: Bearer <paste-token-here>" \
  https://api.example.com/endpoint
```

### 5. **Audit Trail**
Track when users log in and what permissions they have.

## Security Considerations

### ⚠️ Important Notes

1. **Production Warning**
   - The debug pane shows sensitive token data
   - Only use in development
   - Disable or restrict access in production

2. **Token Exposure**
   - Tokens grant access to protected resources
   - Never share tokens
   - Don't log tokens in production

3. **Client-Side Tokens**
   - Access tokens are in browser memory
   - Cleared on logout
   - Automatically refreshed by NextAuth

### Production Recommendations

For production, you can:

**Option 1: Hide Debug Pane**
```typescript
// In components/DebugPane.tsx
if (process.env.NODE_ENV === 'production') {
  return null;
}
```

**Option 2: Redact Sensitive Data**
```typescript
accessToken: {
  decoded: {
    ...formatted,
    // Redact sensitive fields
    sub: 'REDACTED',
    email: 'REDACTED',
  }
}
```

**Option 3: Admin-Only Access**
```typescript
// Only show to admin users
if (!session?.user?.isAdmin) {
  return null;
}
```

## Token Validation

The application doesn't validate tokens locally - validation happens at:
1. **Keycloak** - During login
2. **NextAuth** - During session creation
3. **API Routes** - Via NextAuth session check

The debug pane only **displays** token contents, it doesn't validate or verify them.

## Debugging Token Issues

### Token Not Appearing

**Cause**: Access token not in session

**Check**:
1. Verify `lib/auth.ts` passes token to session
2. Check NextAuth configuration
3. Look for errors in console

### Token Decode Fails

**Cause**: Invalid JWT format

**Check**:
1. Verify token is a valid JWT
2. Check token has 3 parts (header.payload.signature)
3. Ensure token isn't corrupted

### Missing Claims

**Cause**: Keycloak not providing expected claims

**Check**:
1. Keycloak client scopes configuration
2. User attributes in Keycloak
3. Protocol mappers in client

## Testing

### Test Token Decoding

```typescript
import { decodeJWT } from '@/lib/jwt-utils';

const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...';
const payload = decodeJWT(token);

console.log('User:', payload?.email);
console.log('Expires:', new Date(payload?.exp * 1000));
```

### Verify Token Contents

1. Log in to the application
2. Open debug pane
3. Click on the login log entry
4. Expand "View Full Decoded Token"
5. Verify all expected claims are present

## External Tools

You can also use external tools to decode tokens:
- [jwt.io](https://jwt.io) - Paste token to decode
- `jwt` CLI tool - Decode in terminal
- Browser extensions - JWT decoder

## Summary

✅ **Access token contents visible in debug pane**  
✅ **JWT decoding utilities created**  
✅ **Human-readable timestamps**  
✅ **Expandable full token view**  
✅ **Raw token for external testing**  
✅ **Type-safe TypeScript support**  

**Status**: Token debugging fully implemented! Login to see token contents in debug pane. 🎉

## Next Steps

1. Login to the application
2. Check debug pane for token contents
3. Verify token claims are correct
4. Use token for debugging if needed
5. Consider production security (hide/redact sensitive data)
