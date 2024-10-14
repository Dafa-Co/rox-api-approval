import { Transform, TransformCallback, TransformOptions } from "stream";
import { createPublicKey, publicEncrypt, constants, randomBytes, createCipheriv } from "crypto";

export class EncryptionStream extends Transform {
  private publicKey: string;
  private aesKey: Buffer;
  private iv: Buffer;
  private cipher: ReturnType<typeof createCipheriv>;

  constructor(iv: Buffer, aesKey: Buffer, options: TransformOptions = {}) {
    super({ ...options, objectMode: false });

    // Generate a random AES key and IV
    this.aesKey = aesKey;
    this.iv = iv;

    // Create AES cipher
    this.cipher = createCipheriv('aes-256-cbc', this.aesKey, this.iv);
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, done: TransformCallback) {
    try {
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
