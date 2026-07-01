import { TOTP, NobleCryptoPlugin, ScureBase32Plugin } from 'otplib';
import crypto from 'crypto';

// otplib v13 — class-based API with explicit crypto/base32 plugins.
// NOTE: time-drift tolerance (`epochTolerance`) is a VERIFY-time option in v13,
// not a constructor option, and is measured in SECONDS.
const totp = new TOTP({ crypto: new NobleCryptoPlugin(), base32: new ScureBase32Plugin() });

// ±60 s tolerance — handles clock drift and Neon DB cold starts that can delay
// the request by 25-30 s between the user reading the code and submitting it.
const EPOCH_TOLERANCE_SECONDS = 60;

// Derive a 32-byte AES key from AUTH_SECRET
function getAesKey(): Buffer {
    const secret = process.env.AUTH_SECRET || 'fallback-secret-change-this';
    return crypto.createHash('sha256').update(secret).digest();
}

// T141: Generate a TOTP secret
export async function generateTotpSecret(): Promise<string> {
    return totp.generateSecret();
}

// T141: Build an otpauth URI for a QR code
export async function generateQrUrl(email: string, secret: string, appName = 'Restaurant SaaS'): Promise<string> {
    return totp.toURI({ label: email, issuer: appName, secret });
}

// T141: Verify a TOTP code against a secret (plaintext)
export async function verifyTotp(token: string, secret: string): Promise<boolean> {
    try {
        const result = await totp.verify(token, { secret, epochTolerance: EPOCH_TOLERANCE_SECONDS });
        return result.valid;
    } catch {
        return false;
    }
}

// T141: Generate n backup codes in format XXXXX-XXXXX
export function generateBackupCodes(n = 8): string[] {
    return Array.from({ length: n }, () => {
        const a = crypto.randomBytes(3).toString('hex').toUpperCase();
        const b = crypto.randomBytes(3).toString('hex').toUpperCase();
        return `${a}-${b}`;
    });
}

// T142: AES-256-GCM encrypt a TOTP secret
export function encryptSecret(plaintext: string): string {
    const key = getAesKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Encode as iv:authTag:ciphertext (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// T142: Decrypt a TOTP secret
export function decryptSecret(encoded: string): string {
    const [ivHex, authTagHex, encryptedHex] = encoded.split(':');
    const key = getAesKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
