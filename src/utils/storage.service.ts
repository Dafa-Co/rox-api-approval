import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFile, writeFile, access, constants } from 'fs/promises';
import { join } from 'path';

export class StorageService {
  private static memoryStore: Record<string, any> = {};
  private readonly encryptionSecret: string;
  private readonly filePath: string;

  constructor() {
    this.encryptionSecret = process.env.SECURE_STORE_SECRET;

    if (!this.encryptionSecret) {
      throw new Error('SECURE_STORE_SECRET environment variable is not set');
    }

    this.filePath = join(process.cwd(), 'secure-store.dat');

    void this.initialize().catch((error) => {
      console.error('Failed to initialize secure store:', error);
      process.exit(1);
    });
  }

  async put(key: string, value: any, persistToDisk: boolean, versionsToStore: number = 1, expirationTime?: Date): Promise<void> {
    if (versionsToStore < 1) {
      throw new Error('versionsToStore must be at least 1');
    } else if (versionsToStore > 10) {
      throw new Error('versionsToStore must be at most 10');
    }

    value = [{ value, expirationTime }]

    if (versionsToStore > 1) {
      const currentMemoryValues = StorageService.memoryStore[key] || [];
      value = [...value, ...currentMemoryValues]
        .filter((entry: any) => {
          const entryExpirationTime = new Date(entry.expirationTime);
          return entryExpirationTime > new Date();
        })
        .slice(0, versionsToStore);
    }

    StorageService.memoryStore[key] = value;

    if (persistToDisk) {
      const encryptedEntry = await this.encryptEntry(key, value);
      await this.updateDiskStorage(key, encryptedEntry);
    }
  }

  private validateExistingKeys(keys: Array<{
    value: string;
    expirationTime: Date | string;
  }>): any[] {
    const results = keys.map((entry) => {
      if (!entry.expirationTime) return entry.value;

      const entryExpirationTime = new Date(entry.expirationTime);
      return entryExpirationTime > new Date() ? entry.value : null;
    }).filter((entry) => entry !== null);

    if (results.length > 0) {
      return results;
    }
    else {
      throw new Error('Value not found');
    }
  }

  async get(key: string, readFromDisk: boolean): Promise<any> {
    const cachedValue = StorageService.memoryStore[key];

    if (cachedValue) {
      return this.validateExistingKeys(cachedValue);
    }

    if (!readFromDisk) throw new Error('Value not found');

    const diskValue = await this.readFromDisk(key);
    if (!diskValue) throw new Error('Value not found');

    return this.validateExistingKeys(diskValue);
  }

  private async updateDiskStorage(key: string, newEntry: string): Promise<void> {
    let existingEntries: string[] = [];

    try {
      const data = await readFile(this.filePath, 'utf8');
      existingEntries = data.trim().split('\n').filter(entry => entry.trim());
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const filteredEntries: string[] = [];
    for (const entry of existingEntries) {
      try {
        const { key: existingKey } = await this.decryptEntry(entry);
        if (existingKey !== key) filteredEntries.push(entry);
      } catch (error) {
        console.error('Skipping invalid entry:', error);
      }
    }

    filteredEntries.push(newEntry);
    await writeFile(this.filePath, filteredEntries.join('\n') + '\n', { mode: 0o600 });
  }

  private async readFromDisk(key: string): Promise<any> {
    await access(this.filePath, constants.F_OK);
    const data = await readFile(this.filePath, 'utf8');
    const entries = data.trim().split('\n').filter(entry => entry.trim());

    for (const entry of entries.reverse()) {
      try {
        const { key: entryKey, value } = await this.decryptEntry(entry);
        if (entryKey === key) return value;
      } catch (error) {
        console.error('Skipping invalid entry:', error);
      }
    }

    return null;
  };

  private async encryptEntry(key: string, value: any): Promise<string> {
    const salt = randomBytes(16);
    const keyDerived = scryptSync(this.encryptionSecret, salt, 32);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-ctr', keyDerived, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify({ key, value })),
      cipher.final()
    ]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}:${salt.toString('hex')}`;
  }

  private async decryptEntry(encryptedEntry: string): Promise<{ key: string; value: any }> {
    const [ivHex, encryptedHex, saltHex] = encryptedEntry.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const salt = Buffer.from(saltHex, 'hex');
    const keyDerived = scryptSync(this.encryptionSecret, salt, 32);
    const decipher = createDecipheriv('aes-256-ctr', keyDerived, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return JSON.parse(decrypted.toString());
  }

  private async initialize(): Promise<void> {
    try {
      await access(this.filePath, constants.F_OK);
      const data = await readFile(this.filePath, 'utf8');
      const entries = data.trim().split('\n').filter(entry => entry.trim());

      for (const entry of entries) {
        try {
          const { key, value } = await this.decryptEntry(entry);
          StorageService.memoryStore[key] = value;
        } catch (error) {
          console.error('Skipping invalid entry during initialization:', error);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        await writeFile(this.filePath, '', { mode: 0o600 });
      } else {
        throw error;
      }
    }
  }
}