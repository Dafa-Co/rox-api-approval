import { StorageDriver } from "../Interfaces/StorageDriver";
import { BlobServiceClient, ContainerClient, StorageSharedKeyCredential } from "@azure/storage-blob";
import { Request, Response } from "express";
import { Readable } from "stream";
import { azureAccountName, azureAccountKey, azureContainerName, azureEndpoint, validateCredentials } from "../utils/azureConfig";

export class MicrosoftAzure implements StorageDriver {
    private blobServiceClient: BlobServiceClient;
    private containerClient: ContainerClient;

    constructor() {
        validateCredentials();
        const sharedKeyCredential = new StorageSharedKeyCredential(azureAccountName, azureAccountKey);
        this.blobServiceClient = new BlobServiceClient(azureEndpoint, sharedKeyCredential);
        this.containerClient = this.blobServiceClient.getContainerClient(azureContainerName);
    }

    async login(req: Request, res: Response) {
        res.send("No login required for Azure Blob Storage.");
    }

    private async findOrCreateContainer(): Promise<void> {
        const exists = await this.containerClient.exists();
        if (!exists) {
            await this.containerClient.create();
        }
    }

    async getKey(folderName: string, fileName: string): Promise<string> {
        await this.findOrCreateContainer();
        const blobClient = this.containerClient.getBlobClient(`${folderName}/${fileName}`);
        const downloadBlockBlobResponse = await blobClient.download();
        return await this.streamToString(downloadBlockBlobResponse.readableStreamBody as Readable);
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        await this.findOrCreateContainer();
        const blockBlobClient = this.containerClient.getBlockBlobClient(`${folderName}/${fileName}`);
        await blockBlobClient.upload(content, Buffer.byteLength(content));
        return "Text saved to Azure Blob Storage successfully.";
    }

    private async streamToString(stream: Readable): Promise<string> {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString("utf-8");
    }

    async *listFilesIterator(folderName: string, chunkSize: number): AsyncIterableIterator<string[]> {
        let iter = this.containerClient.listBlobsFlat({ prefix: `${folderName}/` }).byPage({ maxPageSize: chunkSize });
        
        for await (const response of iter) {
            const files = response.segment.blobItems.map((blob) => blob.name.replace(`${folderName}/`, ''));
            yield files;
        }
    }


    getTokens(code: string): Promise<any> {
        return;
    }
}
