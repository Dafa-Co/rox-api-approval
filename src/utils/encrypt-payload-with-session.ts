import { SESSION_STORAGE_KEY } from "../constants/communication.constants";
import { readStoredValue } from "./read-stored-value";
import { encryptAES256 } from "./encryption";

export async function encryptPayloadWithSession<PayloadType>(
    payload: PayloadType,
) {
    const sessionKeys: string[] = await readStoredValue({
        readFromDisk: false,
        storageKey: SESSION_STORAGE_KEY,
    });

    if (sessionKeys.length === 0) {
        throw new Error("Failed to encrypt request body");
    }

    return encryptAES256(JSON.stringify(payload), sessionKeys[0]);
}
