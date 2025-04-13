import { initializeKeys } from "src/handshaking/communication-keys-manager";
import { ISendCustodyRequest } from "./interfaces/send-custody-request.interface";

const custodyUrl = process.env.CUSTODY_URL;
const apiKey = process.env.API_KEY;

export async function sendCustodyRequest(
    { path, body, includeVerifyKeyInBody }: ISendCustodyRequest,
) {
    if (includeVerifyKeyInBody) {
        body.verifyKey = apiKey;
    }

    const response = await fetch(
        `${custodyUrl}/${path}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        }
    );

    if (!response.ok) {
        console.error(response)
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

export async function sendSecureCustodyRequest(
    request: ISendCustodyRequest,
) {
    // const communicationKeys = await initializeKeys();

    // const requestResponse = await sendCustodyRequest({
    //     path: 'secure-communication/request-secure-connection',
    //     body: {
    //         publicKey: communicationKeys.publicKey,
    //     },
    //     includeVerifyKeyInBody: false,
    // })
    // const body = request.body;

    // if (request.includeVerifyKeyInBody) {
    //     body.verifyKey = apiKey;
    // }

    // const response = await fetch(
    //     `${custodyUrl}/${request.path}`,
    //     {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: body ? JSON.stringify(body) : undefined,
    //     }
    // );

    // if (!response.ok) {
    //     throw new Error(`HTTP error! status: ${response.status}`);
    // }

    // return response.json();
}