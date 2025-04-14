import * as crypto from 'crypto';
import { IEncryptionResponse } from 'src/Interfaces/encryption-response.interface';

export function encryptAES256(plaintext: string, key: string | Buffer): IEncryptionResponse {
    if (typeof key === 'string') {
        key = crypto.createHash('sha256').update(key).digest();
    }

    // Generate a random 12-byte IV for GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    // Encrypt the plaintext
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const authTag = cipher.getAuthTag().toString('hex');

    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        authTag,
    };
}

export function decryptAES256(encryptedPayload, key) {
    if (typeof key === 'string') {
        key = crypto.createHash('sha256').update(key).digest();
    }

    const iv = Buffer.from(encryptedPayload.iv, 'hex');
    const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
