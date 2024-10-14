import { Transform, TransformCallback, TransformOptions } from "stream";
import { createPublicKey, publicEncrypt, constants, randomBytes, createCipheriv } from "crypto";

export class EncryptionStream extends Transform {
  private publicKey: string;
  private aesKey: Buffer;
  private iv: Buffer;
  private cipher: ReturnType<typeof createCipheriv>;
  private keySent = false; // Ensure keys are sent only once

  constructor(publicKey: string, options: TransformOptions = {}) {
    super({ ...options, objectMode: false });

    this.publicKey = publicKey;

    // Generate a random AES key and IV
    this.aesKey = randomBytes(32); // AES-256 key
    this.iv = randomBytes(16); // Initialization vector

    // Create AES cipher
    this.cipher = createCipheriv('aes-256-cbc', this.aesKey, this.iv);
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, done: TransformCallback) {
    try {
      if (!this.keySent) {
        // Encrypt AES key and IV with RSA
        const encryptedKey = publicEncrypt(
          { key: createPublicKey(this.publicKey), padding: constants.RSA_PKCS1_OAEP_PADDING },
          Buffer.concat([this.aesKey, this.iv])
        );

        // Prefix the key for identification
        const prefix = "ENCRYPTED_AES_KEY:";
        const prefixedEncryptedKey = Buffer.concat([Buffer.from(prefix), encryptedKey]);

        // Send the encrypted key and IV first
        this.push(prefixedEncryptedKey);
        this.keySent = true; // Ensure it's only sent once
      }

      // Encrypt the data with AES
      const encryptedChunk = this.cipher.update(chunk);
      this.push(encryptedChunk);

      done();
    } catch (error) {
      console.error("AES encryption error:", error);
      done(error);
    }
  }

  _flush(done: TransformCallback) {
    try {
      // Finalize the AES encryption
      const finalChunk = this.cipher.final();
      this.push(finalChunk);

      done();
    } catch (error) {
      console.error("Encryption stream flush error:", error);
      done(error);
    }
  }
}
