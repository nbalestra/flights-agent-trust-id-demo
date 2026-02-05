/**
 * JWT Token Utilities
 * Decode JWT tokens to inspect their contents
 */

export interface JWTPayload {
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  iat?: number;
  auth_time?: number;
  azp?: string;
  scope?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification
 * Useful for debugging and inspecting token contents
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    // JWT tokens have 3 parts: header.payload.signature
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Base64 URL decode
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Decode JWT header
 */
export function decodeJWTHeader(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = parts[0];
    const base64 = header.replace(/-/g, '+').replace(/_/g, '/');
    const jsonHeader = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonHeader);
  } catch (error) {
    console.error('Error decoding JWT header:', error);
    return null;
  }
}

/**
 * Check if JWT is expired
 */
export function isJWTExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Get human-readable expiration time
 */
export function getJWTExpiration(token: string): string | null {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;

  const expirationDate = new Date(payload.exp * 1000);
  return expirationDate.toLocaleString();
}

/**
 * Format JWT payload for display
 */
export function formatJWTPayload(payload: JWTPayload): Record<string, any> {
  const formatted: Record<string, any> = { ...payload };

  // Convert timestamps to readable dates
  if (payload.exp) {
    formatted.exp_readable = new Date(payload.exp * 1000).toLocaleString();
  }
  if (payload.iat) {
    formatted.iat_readable = new Date(payload.iat * 1000).toLocaleString();
  }
  if (payload.auth_time) {
    formatted.auth_time_readable = new Date(payload.auth_time * 1000).toLocaleString();
  }

  return formatted;
}
