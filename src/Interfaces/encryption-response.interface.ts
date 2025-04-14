export interface IEncryptionResponse {
    iv: string;
    encryptedData: string;
    authTag: string;
}