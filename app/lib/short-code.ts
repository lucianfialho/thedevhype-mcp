import crypto from 'crypto';

export function generateShortCode(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase();
}
