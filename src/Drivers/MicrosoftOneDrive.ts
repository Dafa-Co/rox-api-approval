import { StorageDriver } from "../Interfaces/StorageDriver";
import { Client } from '@microsoft/microsoft-graph-client';
import { authority, clientId, clientSecret, redirectUri, scope, tokenUrl, validateCredentials } from "../utils/oneDriveConfig";
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
        validateCredentials();
        this.tokens = this.loadTokens();
        this.graphClient = this.createGraphClient();
        this.initializeAccessToken();
    }

    private createGraphClient(): Client {
        return Client.init({
            authProvider: (done) => done(null, this.tokens.accessToken),
        });
    }

    private loadTokens(): Tokens {
        return JSON.parse(readFileSync('tokens.json', 'utf-8')) as Tokens;
    }

    private saveTokens(tokens: Tokens): void {
        writeFileSync('tokens.json', JSON.stringify(tokens));
        console.log('Tokens saved to tokens.json');
    }

    private async refreshAccessToken(): Promise<void> {
        const params = new URLSearchParams({
            client_id: clientId,
            scope: scope,
            refresh_token: this.tokens.refreshToken,
            grant_type: 'refresh_token',
            client_secret: clientSecret,
        }); 

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        

        const { access_token, refresh_token } = response.data;
        this.tokens = { accessToken: access_token, refreshToken: refresh_token };
        this.saveTokens(this.tokens);
        this.graphClient = this.createGraphClient(); // Reinitialize with new access token
    }

    private async initializeAccessToken() {
        try {
            await this.refreshAccessToken();
        } catch (error) {
            console.error('Please login first');
        }
    }

    async getTokens(code: string) {
        const params = new URLSearchParams({
            client_id: clientId,
            scope: scope,
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            client_secret: clientSecret,
        });

        const response = await axios.post(tokenUrl, params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token, refresh_token } = response.data;
        this.tokens = { accessToken: access_token, refreshToken: refresh_token };
        this.saveTokens(this.tokens);
        await this.initializeAccessToken();
    }

    async login(req: Request, res: Response) {
        const msalConfig = {
            auth: { clientId: clientId, authority: authority, clientSecret: clientSecret, redirectUri: redirectUri },
        };
        const cca = new ConfidentialClientApplication(msalConfig);

        const authUrl = await cca.getAuthCodeUrl({
            scopes: [
                'https://graph.microsoft.com/Files.ReadWrite.All',
                'https://graph.microsoft.com/Files.Read.All',
                'offline_access'
            ],
            redirectUri: redirectUri,
        });
        

        res.redirect(authUrl);
    }

    async getKey(folderName: string, fileName: string): Promise<string> {
        const filePath = `/${folderName}/${fileName}`;
        let response = await this.graphClient.api(`/me/drive/root:/${filePath}:/content`).get();

        return await this.streamToString(response); console.log('response', response);;
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        //const folderId = await this.findOrCreateFolder(folderName);
        const filePath = `/${folderName}/${fileName}`;

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

    async *listFilesIterator(folderName: string, chunkSize: number): AsyncIterableIterator<string[]> {
        let nextLink: string | undefined = `/me/drive/root:/${folderName}:/children?top=${chunkSize}`;

        do {
            const response = await this.graphClient.api(nextLink).get();
            nextLink = response['@odata.nextLink'];

            const files = response.value?.map((file: any) => file.name) || [];
            yield files;
        } while (nextLink);
    }
}
