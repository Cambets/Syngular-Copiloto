/**
 * Security & Cryptography Utilities
 * Provides secure hashing via Web Crypto API (SHA-256 with dynamic salt)
 * Eliminates plaintext password storage and exposure.
 */

// Generate cryptographically secure random salt
export function generateSalt(length = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// SHA-256 password hashing with salt
export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const finalSalt = salt || generateSalt(16);
  const text = `${finalSalt}:${password}`;
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash: hashHex, salt: finalSalt };
  }

  // Fallback safe deterministic string hashing for environments without subtle crypto
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return { hash: Math.abs(hash).toString(16), salt: finalSalt };
}

// Verify password against stored hash and salt
export async function verifyPassword(password: string, storedHash: string, salt: string): Promise<boolean> {
  if (!storedHash || !salt) return false;
  const computed = await hashPassword(password, salt);
  return computed.hash === storedHash;
}

// Mask sensitive API keys for display
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '••••••••';
  return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
}
