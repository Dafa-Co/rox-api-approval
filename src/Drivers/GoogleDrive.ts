import { drive_v3, google } from "googleapis";
import { StorageDriver } from "../Interfaces/StorageDriver";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library"; // Import OAuth2Client type
import { CREDENTIALS_PATH, TOKEN_PATH } from "../utils/constants";

const fs = require('fs');

export class GoogleDrive implements StorageDriver {
    private oAuth2Client: OAuth2Client;
    private drive: drive_v3.Drive;

    constructor() {
        this.oAuth2Client = this.createOAuth2Client();
        this.drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
    }

    private async findOrCreateFolder(folderName: string, findOnly = false): Promise<string> {
        const response = await this.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
            fields: 'files(id, name)',
        });

        if (response.data.files && response.data.files.length > 0) {
            return response.data.files[0].id!;
        } else if (findOnly) {
            throw new Error('Folder not found');
        } else {
            const folderMetadata: drive_v3.Schema$File = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            };

            const folderResponse = await this.drive.files.create({
                requestBody: folderMetadata,
                fields: 'id',
            });

            return folderResponse.data.id!;
        }
    }

    private createOAuth2Client(): OAuth2Client {
        const credentials = this.loadCredentials();
        const { client_id, client_secret, redirect_uris } = credentials.web;
        return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    }

    private loadCredentials() {
        if (fs.existsSync(CREDENTIALS_PATH)) {
            return JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
        } else {
            throw new Error('Credentials file not found.');
        }
    }

    private saveToken(tokens: any) {
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Tokens saved to tokens.json');
    }

    // Exchange authorization code for tokens
    async getTokens(code: any) {
        const { tokens } = await this.oAuth2Client.getToken(code);
        console.log('Received tokens:', tokens);
        this.oAuth2Client.setCredentials(tokens);
        this.saveToken(tokens);
    }

    async login(req: Request, res: Response) {
        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly'
        ];

        const authUrl = this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });

        res.redirect(authUrl);
    }

    async getKey(folderName: string, fileName: string) {
        const folderId = await this.findOrCreateFolder(folderName, true);
        const response = await this.drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        if (!response.data.files || response.data.files.length === 0) {
            throw new Error('File not found');
        }

        const fileId = response.data.files[0].id;

        const fileContentResponse = await this.drive.files.get({
            fileId: fileId!,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const fileContent = Buffer.from(fileContentResponse.data as ArrayBuffer).toString('utf-8');

        return fileContent;
    }

    async setKey(folderName: string, fileName: string, content: string) {
        const folderId = await this.findOrCreateFolder(folderName);
        const existingFilesResponse = await this.drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        if (existingFilesResponse.data.files && existingFilesResponse.data.files.length > 0) {
            throw new Error('File already exists');
        }

        const response = await this.drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: 'text/plain',
            },
            media: {
                mimeType: 'text/plain',
                body: content,
            },
        });

        return response;
    }


    async *listFilesIterator(
        folderName: string,
        chunkSize: number
    ): AsyncIterableIterator<string[]> {
        let pageToken: string | undefined = undefined;
        do {
            const response = await this.drive.files.list({
                q: `'${folderName}' in parents and trashed=false`,
                fields: 'nextPageToken, files(id, name)',
                pageToken: pageToken,
                pageSize: chunkSize,
            });

            pageToken = response.data.nextPageToken;

            const files = response.data.files?.map(file => file.name || '') || [];
            yield files;
        } while (pageToken);
    }

}
