import { Storage } from "@google-cloud/storage";
import { StorageDriver } from "../Interfaces/StorageDriver";
import { Request, Response } from "express";
import { bucketName, projectId, validateCredentials } from "../utils/googleCloudStorageConfig";
import path from "path";

export class GoogleCloudStorage implements StorageDriver {
    private storage: Storage;
    private bucket: any;

    constructor() {
        validateCredentials();
        this.storage = new Storage({
            projectId: projectId,
            keyFilename: path.resolve(__dirname, './../../google-cloud-storage.json'),
        });
        this.bucket = this.storage.bucket(bucketName);
    }

    getTokens(code: string): Promise<any> {
        return Promise.resolve();
    }

    async login(req: Request, res: Response): Promise<void> {
        res.send("No login required for Google Cloud Storage.");
    }

    async getKey(folderName: string, fileName: string): Promise<string> {
        const file = this.bucket.file(`${folderName}/${fileName}`);

        const [exists] = await file.exists();
        if (!exists) {
            throw new Error("File not found.");
        }

        const [contents] = await file.download();
        return contents.toString("utf-8");
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        const file = this.bucket.file(`${folderName}/${fileName}`);

        await file.save(content, { resumable: false });
        return "Text saved to Google Cloud Storage successfully.";
    }

    async *listFilesIterator(folderName: string, chunkSize: number): AsyncIterableIterator<string[]> {
        let pageToken: string | undefined = undefined;
        do {
            const [files, , response] = await this.bucket.getFiles({
                prefix: `${folderName}/`,
                maxResults: chunkSize,
                pageToken: pageToken,
            });

            pageToken = response.pageToken;

            const fileNames = files.map((file: { name: string; }) => file.name.replace(`${folderName}/`, ""));
            yield fileNames;
        } while (pageToken);
    }
}
