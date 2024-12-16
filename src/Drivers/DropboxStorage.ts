import { StorageDriver } from "../Interfaces/StorageDriver";
import { Request, Response } from "express";
import { readFileSync, writeFileSync } from "fs";
import axios from "axios";
import {
  ITokens,
  dropboxConfig,
  redirectUri,
  validateCredentials,
} from "../utils/dropboxConfig";
import { TOKEN_PATH } from "../utils/constants";
import { Dropbox } from "dropbox";
import path from "path";
import * as fs from 'fs';

export class DropboxStorage implements StorageDriver {
  private dbx: any; //Dropbox;

  constructor() {
    validateCredentials();
    this.dbx = new Dropbox(dropboxConfig);
    //this.tokens = JSON.parse(readFileSync(TOKEN_PATH, "utf-8")) as ITokens;
    
    this.initializeAccessToken();
  }

  init() {
    const rootPath = process.cwd();
    const filePath = `${rootPath}/${TOKEN_PATH}`;

    return fs.existsSync(filePath);
  }

  private async initializeAccessToken() {
    //const response = await this.refreshAccessToken(this.tokens.refresh_token);
    this.dbx = new Dropbox({
      accessToken: dropboxConfig.accessToken,
      clientId: dropboxConfig.clientId,
      clientSecret: dropboxConfig.clientSecret,
    });    
  }

  async getTokens(code: string): Promise<any> {
    const res = await this.dbx.auth.getAccessTokenFromCode(redirectUri, code);

    this.saveToken(res.result);

    return res;
  }

  private saveToken(tokens: ITokens) {
    writeFileSync("tokens.json", JSON.stringify(tokens));
    console.log("Tokens saved to tokens.json");
  }

  async login(req: Request, res: Response) {
    this.dbx.auth
      .getAuthenticationUrl(
        redirectUri,
        null,
        "code",
        "offline",
        null,
        "none",
        false
      )
      .then((authUrl: any) => {
        res.writeHead(302, { Location: authUrl });
        res.end();
      });
  }

  private async findOrCreateFolder(folderName: string): Promise<string> {
    try {
      const response = await this.dbx.filesCreateFolderV2({
        path: `/${folderName}`,
      });

      return response.result.metadata.name;
    } catch (error: any) {
      if (error.status === 409) {
        return folderName;
      }

      return "Error: " + error.message;
    }
  }

  async getKey(folderName: string, fileName: string): Promise<string> {
    const filePath = `/${folderName}/${fileName}`;
    const response = await this.dbx.filesDownload({ path: filePath });
    const file = response.result;

    if ("fileBinary" in file) {
      return (file.fileBinary as Buffer).toString("utf-8");
    }

    return "File not found";
  }

  async setKey(
    folderName: string,
    fileName: string,
    content: string
  ): Promise<string> {
    await this.findOrCreateFolder(folderName);

    const filePath = `/${folderName}/${fileName}`;

    await this.dbx.filesUpload({
      path: filePath,
      contents: content,
      mode: { ".tag": "overwrite" },
      autorename: true,
      mute: false,
    });

    return "Text saved to Dropbox successfully.";
  }

  async *listFilesIterator(
    folderName: string,
    chunkSize: number
  ): AsyncIterableIterator<string[]> {
    let cursor: string | undefined;

    do {
      const response = cursor
      ? await this.dbx.filesListFolderContinue({ cursor })
      : await this.dbx.filesListFolder({ path: `/${folderName}`, limit: chunkSize });

      cursor = response.result.cursor;

      const files = response.result.entries.map((entry: any) => entry.name);
      yield files;
    } while (cursor && cursor.length > 0);
  }
}
