import { Request, Response } from "express";
import { drive_v3 } from "googleapis";

export interface StorageDriver {
  login(req: Request, res: Response): Promise<any>;
  getTokens(code: string): Promise<any>;
  getKey(folderName: string, fileName: string): Promise<any>;
  setKey(folderName: string, fileName: string, content: string): Promise<any>;
}