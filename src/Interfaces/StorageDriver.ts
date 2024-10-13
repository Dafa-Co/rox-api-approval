import { Request, Response } from "express";

export interface StorageDriver {
  login(req: Request, res: Response): Promise<any>;
  getTokens(code: string): Promise<any>;
  getKey(folderName: string, fileName: string): Promise<any>;
  setKey(folderName: string, fileName: string, content: string): Promise<any>;

  // Get an async iterator for listing files in a folder
  listFilesIterator(folderName: string, chunkSize: number): AsyncIterableIterator<string[]>;

}
