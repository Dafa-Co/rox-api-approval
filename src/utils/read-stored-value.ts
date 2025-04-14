import { StorageService } from "./storage.service";

export async function readStoredValue(
    {
        envKey,
        storageKey,
        readFromDisk,
    }: {
        storageKey?: string;
        envKey?: string;
        readFromDisk?: boolean;
    }
) {
    try {
        if (storageKey) return await new StorageService().get(storageKey, readFromDisk);
    } catch {
        console.info(`${storageKey} loaded from environment variables`);
    }

    if (!envKey) throw new Error('Environment variable key is not provided');

    const envValue = process.env[envKey];

    if (!envValue) throw new Error(`Environment variable ${envKey} is not set`);

    return envValue;
}