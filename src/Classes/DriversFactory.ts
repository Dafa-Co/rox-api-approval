import { GoogleDrive } from './../Drivers/GoogleDrive';
import { DriversEnum } from "../Enums/DriversEnum";
import { StorageDriver } from "../Interfaces/StorageDriver";
import { MicrosoftOneDrive } from './../Drivers/MicrosoftOneDrive';
import { Request, Response } from 'express';

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
}