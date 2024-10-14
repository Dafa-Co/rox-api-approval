import { StorageDriver } from "../Interfaces/StorageDriver";
import { Request, Response } from "express";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { accessKey, bucketName, endpoint, region, secretKey, validateCredentials } from "../utils/amazonConfig";

export class AmazonS3 implements StorageDriver {
    private s3Client: S3Client;

    constructor() {
        validateCredentials();
        this.s3Client = new S3Client({
            region: region,
            endpoint: endpoint,
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
        });
    }

    getTokens(code: string): Promise<any> {
        return;
    }

    private async findOrCreateFolder(folderName: string): Promise<string> {
        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: folderName + "/",
            Delimiter: "/",
        });
        const response = await this.s3Client.send(command);

        if (response.Contents && response.Contents.length > 0) {
            return folderName;
        } else {
            // Create a placeholder object to represent the folder
            await this.s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: `${folderName}/`
            }));
            return folderName;
        }
    }

    async login(req: Request, res: Response) {
        res.send("No login required for S3.");
    }

    async getKey(folderName: string, fileName: string): Promise<string> {
        const folderPath = await this.findOrCreateFolder(folderName);
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: `${folderPath}/${fileName}`
        });
        const response = await this.s3Client.send(command);
        const fileContent = await this.streamToString(response.Body as Readable);

        return fileContent;
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        const folderPath = await this.findOrCreateFolder(folderName);

        await this.s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: `${folderPath}/${fileName}`,
            Body: content
        }));

        return "Text saved to S3 successfully.";
    }

    private async streamToString(stream: Readable): Promise<string> {
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString("utf-8");
    }


    async *listFilesIterator(folderName: string, chunkSize: number): AsyncIterableIterator<string[]> {
        let continuationToken: string | undefined = undefined;
        do {
            const command = new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: `${folderName}/`,
                ContinuationToken: continuationToken,
                MaxKeys: chunkSize
            });
            const response = await this.s3Client.send(command);
            continuationToken = response.NextContinuationToken;

            const files = response.Contents?.map(file => file.Key?.replace(`${folderName}/`, '') || '') || [];
            yield files;
        } while (continuationToken);
    }

}
