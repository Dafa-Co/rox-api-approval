export interface IKey {
    keyId: string;
    content: string;
}

export interface HashedKey extends IKey {
    hash: string;
}

export interface IKeyStream {
    hash: string;
    encryptedContent: string;
}
