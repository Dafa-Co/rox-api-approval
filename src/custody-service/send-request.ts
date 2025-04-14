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
