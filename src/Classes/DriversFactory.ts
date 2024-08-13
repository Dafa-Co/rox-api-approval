import { GoogleDrive } from './../Drivers/GoogleDrive';
import { drive_v3 } from "googleapis";
import { DriversEnum } from "../Enums/DriversEnum";
import { StorageDriver } from "../Interfaces/StorageDriver";

export class DriversFactory {
  private driver: DriversEnum;
  private factory: StorageDriver;

  constructor(driver: DriversEnum) {
    this.driver = driver;
    this.factory = this.getFactory();
  }

  private getFactory(): StorageDriver {
    switch (this.driver) {

      case DriversEnum.google:
        return new GoogleDrive();
    }
  }

  async getKey(folderName: string, fileName: string, drive: drive_v3.Drive): Promise<string> {
    return await this.factory.getKey(folderName, fileName, drive);
  }

  async setKey(folderName: string, fileName: string, content: string, drive: drive_v3.Drive) {
    return await this.factory.setKey(folderName, fileName, content, drive);
  }
}