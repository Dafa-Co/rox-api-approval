import { StorageDriver } from "../Interfaces/StorageDriver";
import { Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";
import axios from "axios";
import { ITokens, dropboxConfig, redirectUri } from "../utils/dropboxConfig";
import { TOKEN_PATH } from "../utils/constants";

const { Dropbox } = require('dropbox');

export class DropboxStorage implements StorageDriver {
    private dbx;
    private tokens: ITokens;

    constructor() {
        this.dbx = new Dropbox(dropboxConfig);
        this.tokens = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8')) as ITokens;
        this.initializeAccessToken();
    }

    private async initializeAccessToken() {
        const response = await this.refreshAccessToken(this.tokens.refresh_token);
        this.dbx = new Dropbox({
            accessToken: response.data.access_token,  // Set the new access token
            clientId: dropboxConfig.clientId,
            clientSecret: dropboxConfig.clientSecret,
        });
    }


    private async refreshAccessToken(refreshToken: string): Promise<any> {
        const response = await axios.post('https://api.dropboxapi.com/oauth2/token', 
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: this.tokens.refresh_token,
            }).toString(), 
            {
                headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${dropboxConfig.clientId}:${dropboxConfig.clientSecret}`).toString('base64')}`
                }
            }
        ); 

        this.saveToken({
            access_token: response.data.access_token,
            account_id: this.tokens.account_id,
            expires_in: response.data.expires_in,
            refresh_token: this.tokens.refresh_token,
            scope: this.tokens.scope,
            uid: this.tokens.uid,
            token_type: response.data.token_type
        });

        return response 
    }
    
    async getTokens(code: string): Promise<any> {
        const res = await this.dbx.auth.getAccessTokenFromCode(redirectUri, code);
        
        this.saveToken(res.result);

        return res;
    }

    private saveToken(tokens: ITokens) {
        writeFileSync('tokens.json', JSON.stringify(tokens));
        console.log('Tokens saved to tokens.json');
    }

    async login(req: Request, res: Response) {
        this.dbx.auth.getAuthenticationUrl(redirectUri, null, 'code', 'offline', null, 'none', false).then((authUrl: any) => {
            res.writeHead(302, { Location: authUrl });
            res.end();
        });
    }

    private async findOrCreateFolder(folderName: string): Promise<string> {
        try {
            const response = await this.dbx.filesCreateFolderV2({ path: `/${folderName}` });

            return response.result.metadata.name;
        } catch (error: any) {
            if(error.status === 409) {
                return folderName;
            }

            return 'Error: ' + error.message;
        }
    }

    async getKey(folderName: string, fileName: string): Promise<string> {
        const filePath = `/${folderName}/${fileName}`;
        const response = await this.dbx.filesDownload({ path: filePath });
        const file = response.result;

        if ('fileBinary' in file) {
            return (file.fileBinary as Buffer).toString('utf-8');
        }

        return 'File not found';
    }

    async setKey(folderName: string, fileName: string, content: string): Promise<string> {
        await this.findOrCreateFolder(folderName);
        
        const filePath = `/${folderName}/${fileName}`;  

        await this.dbx.filesUpload({
            path: filePath,
            contents: content, 
            mode: { ".tag": "overwrite" }, 
            autorename: true, 
            mute: false
        });

        return "Text saved to Dropbox successfully.";
    }
}
