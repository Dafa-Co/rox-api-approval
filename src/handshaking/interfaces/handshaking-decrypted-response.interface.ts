export interface IHandshakingDecryptedResponse {
    sessionKey: string;
    sessionExpirationDate: Date;
    id: number;
    verifyKey: string;
}