import * as crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const KEY_DIR = process.env.KEY_DIR || 'tmp/app/keys';
const KEY_FILE_PERMS = 0o600
const KEY_DIR_PERMS = 0o700;

async function generateKeyPair(): Promise < {
    privateKey: string;
    publicKey: string;
} > {
    return new Promise((resolve, reject) => {
        crypto.generateKeyPair(
            'rsa',
            {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            },
            (err, publicKey, privateKey) => {
                if (err) reject(err);
                resolve({ privateKey, publicKey });
            },
        );
    });
}

async function ensureKeyDirectory() {
    try {
        await fs.mkdir(KEY_DIR, {
            recursive: true,
            mode: KEY_DIR_PERMS
        });

        // Verify and fix permissions if needed
        const stats = await fs.stat(KEY_DIR);
        if ((stats.mode & 0o777) !== KEY_DIR_PERMS) {
            await fs.chmod(KEY_DIR, KEY_DIR_PERMS);
        }
    } catch (error) {
        console.error(`Failed to initialize key directory: ${error}`);
        process.exit(1);
    }
}

async function writeKeyFile(filename: string, content: string) {
    const filePath = path.join(KEY_DIR, filename);
    await fs.writeFile(filePath, content, {
        mode: KEY_FILE_PERMS,
        flag: 'wx'
    });
}

async function readKeyFile(filename: string) {
    const filePath = path.join(KEY_DIR, filename);
    return fs.readFile(filePath, {
        encoding: 'utf-8',
        flag: 'r'
    });
}

// Modified initialization logic
export async function initializeKeys() {
    await ensureKeyDirectory();

    try {
        const [publicKey, privateKey] = await Promise.all([
            readKeyFile('public.pem'),
            readKeyFile('private.pem')
        ]);

        return { publicKey, privateKey };
    } catch (error) {
        // Generate new keys if files don't exist
        const newKeys = await generateKeyPair();

        await Promise.all([
            writeKeyFile('public.pem', newKeys.publicKey),
            writeKeyFile('private.pem', newKeys.privateKey)
        ]);

        return newKeys;
    }
}
