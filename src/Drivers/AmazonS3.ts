import { StorageDriver } from "../Interfaces/StorageDriver";
import { Request, Response } from "express";
import { GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import * as dotenv from 'dotenv';
import * as process from 'process';

dotenv.config();

export class AmazonS3 implements StorageDriver {
    private s3Client: S3Client;
    private bucketName: string;

    constructor() {
        this.bucketName = process.env.BUCKETNAME || '';
        const accessKey = process.env.BUCKETKEY || '';
        const secretKey = process.env.BUCKETSECRET || '';
        const region = process.env.BUCKETREGION || '';

        this.s3Client = new S3Client({
            region: region,
            endpoint: process.env.AWS_ENDPOINT || '',
            credentials: {
                accessKeyId: accessKey,
                secretAccessKey: secretKey,
            },
        });
    }
    
    getTokens(code: string): Promise<any> {
        throw new Error("Method not implemented.");
    }

    private async findOrCreateFolder(folderName: string): Promise<string> {
        const command = new ListObjectsV2Command({
            Bucket: this.bucketName,
            Prefix: folderName + "/",
            Delimiter: "/"
        });
        const response = await this.s3Client.send(command);

        if (response.Contents && response.Contents.length > 0) {
            return folderName;
        } else {
            // Create a placeholder object to represent the folder
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
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
            Bucket: this.bucketName,
            Key: `${folderPath}/${fileName}`
        });
        const response = await this.s3Client.send(command);
        const fileContent = await this.streamToString(response.Body as Readable);

        return fileContent;
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        const folderPath = await this.findOrCreateFolder(folderName);

        await this.s3Client.send(new PutObjectCommand({
            Bucket: this.bucketName,
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
}
