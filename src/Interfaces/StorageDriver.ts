import { drive_v3 } from "googleapis";

export interface StorageDriver {
  setKey(folderName: string, fileName: string, content: string, drive: drive_v3.Drive): Promise<string>;
  getKey(folderName: string, fileName: string, drive: drive_v3.Drive): Promise<string>;
}