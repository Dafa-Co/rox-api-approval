import { GoogleDrive } from "./../Drivers/GoogleDrive";
import { DriversEnum } from "../Enums/DriversEnum";
import { StorageDriver } from "../Interfaces/StorageDriver";
import { MicrosoftOneDrive } from "./../Drivers/MicrosoftOneDrive";
import { Request, Response } from "express";
import { AmazonS3 } from "../Drivers/AmazonS3";
import { DropboxStorage } from "../Drivers/DropboxStorage";

export function IsSelectAll(arr: any[]) {
  return arr.length === 1 && !arr[0];
}

export class DriversFactory {
  private driver: DriversEnum;
  private factory: StorageDriver;

  constructor(driver: DriversEnum) {
    this.driver = driver;
    this.factory = this.getFactory();
  }

  private getFactory(): StorageDriver {
    switch (this.driver) {
      case DriversEnum.googleDrive:
        return new GoogleDrive();
      case DriversEnum.oneDrive:
        return new MicrosoftOneDrive();
      case DriversEnum.amazonS3:
        return new AmazonS3();
      case DriversEnum.dropbox:
        return new DropboxStorage();
    }
  }

  async login(req: Request, res: Response): Promise<string> {
    return await this.factory.login(req, res);
  }

  async getTokens(code: string): Promise<string> {
    return await this.factory.getTokens(code);
  }

  async getKey(folderName: string, fileName: string): Promise<string> {
    return await this.factory.getKey(folderName, fileName);
  }

  async setKey(folderName: string, fileName: string, content: string) {
    return await this.factory.setKey(folderName, fileName, content);
  }

  async *listFilesIterator(
    folderName: string,
    keysIds: number[],
    chunkSize: number = 100
  ): AsyncIterableIterator<string[]> {
    const isSelectAll = IsSelectAll(keysIds);

    if (isSelectAll) {
      for await (const files of this.factory.listFilesIterator(folderName, chunkSize)) {
        yield files;
      }
    } else {
      for (let i = 0; i < keysIds.length; i += chunkSize) {
        yield keysIds.slice(i, i + chunkSize).map((id) => id.toString());
      }
    }
  }
}
