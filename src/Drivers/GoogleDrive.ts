import { drive_v3 } from "googleapis";
import { StorageDriver } from "../Interfaces/StorageDriver";
 
export class GoogleDrive implements StorageDriver {
    private async findOrCreateFolder(drive: drive_v3.Drive, folderName: string, findOnly = false): Promise<string> {
        try {
            // Check if the folder already exists
            const response = await drive.files.list({
                q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
                fields: 'files(id, name)',
            });

            // If folder exists, return its ID
            if (response.data.files && response.data.files.length > 0) {
                return response.data.files[0].id!;
            } else if(findOnly) {
                throw new Error('Folder not found');
            } else {
                // Create a new folder
                const folderMetadata: drive_v3.Schema$File = {
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                };

                const folderResponse = await drive.files.create({
                    requestBody: folderMetadata,
                    fields: 'id',
                });

                return folderResponse.data.id!;
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Error finding or creating folder: ${error.message}`);
            } else {
                throw new Error('An unknown error occurred while finding or creating the folder.');
            }
        }
    }

    async getKey(folderName: string, fileName: string, drive: any) {
        const folderId = await this.findOrCreateFolder(drive, folderName);
        const response = await drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        if (response.data.files.length === 0) {
            throw new Error('File not found');
        }

        const fileId = response.data.files[0].id;

        const fileContentResponse = await drive.files.get({
            fileId: fileId,
            alt: 'media'
        }, { responseType: 'arraybuffer' });

        const fileContent = Buffer.from(fileContentResponse.data).toString('utf-8');

        return fileContent;
    }

    async setKey(folderName: string, fileName: string, content: string, drive: any) {
        const folderId = await this.findOrCreateFolder(drive, folderName);
        const existingFilesResponse = await drive.files.list({
            q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
            fields: 'files(id, name)',
        });

        if (existingFilesResponse.data.files && existingFilesResponse.data.files.length > 0) {
            throw new Error('File already exists');
        }

        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: 'text/plain',
            },
            media: {
                mimeType: 'text/plain',
                body: content,
            },
        });
        

        return response;
    }
}