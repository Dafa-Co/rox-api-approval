import { StorageDriver } from "../Interfaces/StorageDriver";
import { Client } from '@microsoft/microsoft-graph-client';
import { authority, clientId, clientSecret, redirectUri, scope, tokenUrl } from "../utils/oneDriveConfig";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { Request, Response } from "express";
import axios from "axios";
import { readFileSync, writeFileSync } from 'fs';

interface Tokens {
    accessToken: string;
    refreshToken: string;
}

export class MicrosoftOneDrive implements StorageDriver {
    private tokens: Tokens;
    private graphClient: Client;

    constructor() {
        this.tokens = JSON.parse(readFileSync('tokens.json', 'utf-8')) as Tokens;
        this.graphClient = Client.init({
            authProvider: (done) => {
                done(null, this.tokens.accessToken);
            }
        });
    }

    private async refreshAccessToken(refreshToken: string): Promise<Tokens> {
        const params = new URLSearchParams({
            client_id: clientId,
            scope: scope,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            client_secret: clientSecret
        });

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        const newTokens = { accessToken: access_token, refreshToken: newRefreshToken };
        writeFileSync('tokens.json', JSON.stringify(newTokens));

        return newTokens;
    }

    private async initializeAccessToken() {
        this.tokens = await this.refreshAccessToken(this.tokens.refreshToken);
        this.graphClient = Client.init({
            authProvider: (done) => {
                done(null, this.tokens.accessToken);
            }
        });
    }

    private saveToken(tokens: Tokens) {
        writeFileSync('tokens.json', JSON.stringify(tokens));
        console.log('Tokens saved to tokens.json');
    }

    async getTokens(code: any) {
        const params = new URLSearchParams({
            client_id: clientId,
            scope: scope,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            client_secret: clientSecret
        });

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token } = response.data;
        this.tokens = { accessToken: access_token, refreshToken: refresh_token };
        this.saveToken(this.tokens);
        this.initializeAccessToken();  // Reinitialize graphClient with new tokens
    }

    async login(req: Request, res: Response) {
        const msalConfig = {
            auth: {
                clientId: clientId,
                authority: authority,
                clientSecret: clientSecret,
                redirectUri: redirectUri
            }
        };
        const cca = new ConfidentialClientApplication(msalConfig);
        const authUrl = await cca.getAuthCodeUrl({
            scopes: ['https://graph.microsoft.com/.default', 'offline_access'],  // Request offline_access for refresh token
            redirectUri: redirectUri
        });

        res.redirect(authUrl);
    }

    private async findOrCreateFolder(folderName: string, findOnly = false): Promise<string> {
        // Check if the folder already exists
        const response = await this.graphClient.api('/me/drive/root/children')
            .filter(`folder ne null and name eq '${folderName}'`)
            .get();

        if (response.value && response.value.length > 0) {
            return response.value[0].id;
        } else if (findOnly) {
            throw new Error('Folder not found');
        } else {
            // Create a new folder
            const folderMetadata = {
                name: folderName,
                folder: {},
                "@microsoft.graph.conflictBehavior": "rename"
            };

            const folderResponse = await this.graphClient.api('/me/drive/root/children').post(folderMetadata);
            return folderResponse.id;
        }
    }

    async getKey(folderName: string, fileName: string): Promise<string> {
        const folderId = await this.findOrCreateFolder(folderName, true);
        const response = await this.graphClient.api(`/me/drive/items/${folderId}/children`)
            .filter(`name eq '${fileName}'`)
            .get();

        if (!response.value || response.value.length === 0) {
            throw new Error('File not found');
        }

        const fileId = response.value[0].id;

        const fileContentResponse = await this.graphClient.api(`/me/drive/items/${fileId}/content`).get();
        return this.streamToString(fileContentResponse);
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        const filePath = `/${folderName ? folderName + '/' : ''}${fileName}`;
            
        await this.graphClient.api(`/me/drive/root:/${filePath}:/content`).put(content);

        return 'Text saved to OneDrive successfully.';
    }

    private async streamToString(stream: ReadableStream): Promise<string> {
        const reader = stream.getReader();
        let result = '';
        const decoder = new TextDecoder();

        let done = false;
        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            result += decoder.decode(value, { stream: !done });
        }

        return result;
    }
}
