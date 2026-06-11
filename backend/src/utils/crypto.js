/**
 * AES-256-GCM envelope encryption for sensitive fields stored in the database.
 *
 * Requires ENCRYPTION_KEY env var — a 64-char hex string (32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require('crypto');

const ALGO    = 'aes-256-gcm';
const IV_LEN  = 12;   // 96-bit IV recommended for GCM
const TAG_LEN = 16;

function getKey() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  return Buffer.from(raw.slice(0, 64), 'hex');
}

/**
 * Encrypt plaintext → "iv:ciphertext:tag" (all hex), or return null if input is null/undefined.
 */
function encrypt(plaintext) {
  if (plaintext == null) return null;
  const key = getKey();
  const iv  = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc  = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

/**
 * Decrypt "iv:ciphertext:tag" → plaintext string, or return null if input is null/undefined.
 * Returns the raw value unchanged if it doesn't match the expected format (backwards compat).
 */
function decrypt(stored) {
  if (stored == null) return null;
  const parts = stored.split(':');
  if (parts.length !== 3) return stored;  // not encrypted (legacy plain value)
  try {
    const key    = getKey();
    const iv     = Buffer.from(parts[0], 'hex');
    const enc    = Buffer.from(parts[1], 'hex');
    const tag    = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc) + decipher.final('utf8');
  } catch {
    return null;  // decryption failed — treat as missing credential
  }
}

module.exports = { encrypt, decrypt };
