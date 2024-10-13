import { Response } from "express";
import { DriversFactory } from "src/Classes/DriversFactory";
import { IApiApprovalSyncInterface } from "src/Interfaces/api-approval-sync.interface";
import { publicEncrypt, constants } from "crypto";

/**
 * Handle the synchronization process and push updates as a stream to the client.
 */
export async function handleSync(
  res: Response,
  payload: IApiApprovalSyncInterface,
  driversFactory: DriversFactory
) {
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const { keysIds, publicKey, vaultName } = payload;
  const folderName = `${vaultName}`;
  const iterator = driversFactory.listFilesIterator(folderName, keysIds);

  let clientConnected = true;
  res.on('close', () => {
    console.log('Client disconnected');
    clientConnected = false;
  });

  try {
    // Iterate through the files in the folder
    for await (const files of iterator) {
      if (!clientConnected) break; // Stop if client disconnects

      for (const file of files) {
        if (!clientConnected) break; // Stop if client disconnects

        const fileContent = await driversFactory.getKey(folderName, file);

        const dataObject = { keyId: file, key: fileContent };

        let encryptedContent: string;
        try {
          encryptedContent = publicEncrypt(
            { key: publicKey, padding: constants.RSA_PKCS1_OAEP_PADDING },
            Buffer.from(JSON.stringify(dataObject), "utf-8")
          ).toString("base64");
        } catch (encryptionError) {
          console.error(`Encryption error for file ${file}:`, encryptionError);
          res.write(`data: {"error": "Encryption failed for ${file}"}\n\n`);
          continue;
        }

        const canContinue = res.write(encryptedContent + "\n");
        if (!canContinue) {
          console.log('Backpressure detected, waiting for drain event');
          await new Promise<void>((resolve) => res.once('drain', resolve));
        }
      }
    }

    if (clientConnected) res.end();
  } catch (error) {
    console.log('Error during sync:', error);
    if (clientConnected) {
      res.write(`data: {"error": "${error.message}"}\n\n`);
      res.end();
    }
  }
}
