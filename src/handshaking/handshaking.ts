import { decryptAES256, encryptAES256 } from "../utils/encryption";
import { sendCustodyRequest } from "../custody-service/send-request";
import { initializeKeys } from "./communication-keys-manager";
import * as crypto from 'crypto';
import { IHandshakingDecryptedResponse } from "./interfaces/handshaking-decrypted-response.interface";
import { IEncryptionResponse } from "../Interfaces/encryption-response.interface";
import { StorageService } from "../utils/storage.service";
import { HEALTH_CHECK_KEY_STORAGE_KEY, SESSION_STORAGE_KEY, VERIFY_KEY_STORAGE_KEY } from "../constants/communication.constants";

const serverUrl = process.env.URL;

async function getVerifyKey() {
    const storageService = new StorageService();
    let verifyKey: string = process.env.API_KEY;

    try {
        [verifyKey] = await storageService.get(VERIFY_KEY_STORAGE_KEY, true);
    } catch (e) {
        console.error('Verify Key not found in storage, using environment variable', e);
        console.info('Verify Key loaded from environment variables');
    }

    return verifyKey;
}

export async function handshaking() {
    const verifyKey = await getVerifyKey();
    const storageService = new StorageService();
    const keys = await initializeKeys();

    const communicationKeys = await initializeKeys();
    const requestResponse: {
        id: number,
        key: string,
    } = await sendCustodyRequest({
        path: 'bridge-server/request-secure-connection',
        body: {
            publicKey: communicationKeys.publicKey,
        },
        includeVerifyKeyInBody: false,
    })

    const key = crypto.privateDecrypt(
        keys.privateKey,
        Buffer.from(requestResponse.key, 'base64')
    ).toString('utf-8');

    const encryptedPayload = encryptAES256(
        JSON.stringify({
            publicKey: keys.publicKey,
            serverUrl,
            verifyKey,
        }),
        key
    );

    const response: { encryptedResponse: IEncryptionResponse, healthCheckKey: string } = await sendCustodyRequest({
        includeVerifyKeyInBody: false,
        path: 'bridge-server/handshake',
        body: {
            encryptedPayload: encryptedPayload,
            encryptionId: requestResponse.id,
        }
    });

    const decryptedResponse: IHandshakingDecryptedResponse = JSON.parse(decryptAES256(
        response.encryptedResponse,
        key
    ));

    await Promise.all([
        storageService.put(SESSION_STORAGE_KEY, decryptedResponse.sessionKey, false, 2, decryptedResponse.sessionExpirationDate),
        storageService.put(VERIFY_KEY_STORAGE_KEY, decryptedResponse.verifyKey, true),
        storageService.put(HEALTH_CHECK_KEY_STORAGE_KEY, response.healthCheckKey, false)
    ]);

    console.info('Handshake has been completed successfully at', new Date().toISOString());
}