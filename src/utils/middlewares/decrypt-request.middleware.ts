import { NextFunction, Request, Response } from "express";
import { decryptAES256 } from "../encryption";
import { readStoredValue } from "../read-stored-value";
import { HEALTH_CHECK_KEY_STORAGE_KEY, SESSION_STORAGE_KEY } from "../../constants/communication.constants";

export async function decryptRequest(
    req: Request, 
    res: Response, 
    next: NextFunction,
    isSessionKeys: boolean = true
) {
    const body = req.body;

    const keys: string[] = await readStoredValue({
        readFromDisk: false,
        storageKey: isSessionKeys ? SESSION_STORAGE_KEY : HEALTH_CHECK_KEY_STORAGE_KEY,
    })

    for (const key of keys) {
        try {
            const decryptedBody = decryptAES256(body, key);
            req.body = JSON.parse(decryptedBody);

            return next();
        } catch (error) {
            console.error("Decryption failed for a key");
        }
    }

    return res.status(500).json({ error: "Failed to decrypt request body" });
}
