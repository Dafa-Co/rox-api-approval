import { Response } from "express";
import { DriversFactory } from "src/Classes/DriversFactory";
import { IApiApprovalSyncInterface } from "src/Interfaces/api-approval-sync.interface";
import { Readable, pipeline, TransformCallback } from "stream";
import { promisify } from "util";
import { SHA256CalculatorStream } from "./streams/sha256-calculator.stream";
import { ApiApprovalKeyDownloader } from "./streams/api-downloader.stream";
import { EncryptionStream } from "./streams/encypt.stream";

const pipelineAsync = promisify(pipeline);

export async function handleSync(
  res: Response,
  payload: IApiApprovalSyncInterface,
  driversFactory: DriversFactory
) {
  // Set response headers for streaming
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Send headers immediately to the client

  const { keysIds, publicKey, vaultName } = payload;
  const folderName = `${vaultName}`;

  let clientConnected = true;

  // Monitor client disconnection
  res.on("close", () => {
    console.log("Client disconnected");
    clientConnected = false;
  });

  // Create an async iterable to generate files
  const fileIterator = async function* (): AsyncGenerator<string> {
    for await (const files of driversFactory.listFilesIterator(folderName, keysIds)) {
      for (const file of files) {
        console.log(`Processing file: ${file}`);
        yield file;
      }
    }
  };

  try {
    // Create a readable stream with proper backpressure handling
    const fileStream = new Readable({
      objectMode: true,
      async read() {
        try {
          for await (const file of fileIterator()) {
            if (!this.push(file)) {
              // Stop reading if backpressure is detected
              console.log('Backpressure detected, pausing the generator');
              break;
            }
          }
          this.push(null); // Signal end of stream
        } catch (error) {
          console.error('Error in file generator:', error);
          this.destroy(error); // Destroy the stream on error
        }
      },
    });

    // Initialize all processing streams
    const downloader = new ApiApprovalKeyDownloader(driversFactory, folderName, {}, 10);
    const sha256Calculator = new SHA256CalculatorStream();
    const encryptor = new EncryptionStream(publicKey);

    // Handle client disconnection properly
    res.on("close", () => {
      console.log("Closing downloader stream...");
      downloader.end(); // Stop downloader if the client disconnects
    });

    console.log("Starting sync...");

    // Use pipeline to manage the data flow and backpressure
    await pipelineAsync(
      fileStream,           // Source stream from files
      downloader,           // Concurrent file downloader (limit: 10)
      sha256Calculator,     // Calculate SHA-256 hash
      encryptor,            // Encrypt the data
      res                   // Send the encrypted data to the client
    );

    console.log("Sync completed successfully.");
  } catch (error) {
    console.error("Error during sync:", error);

    if (clientConnected) {
      res.write(`data: {"error": "${error.message}"}\n\n`);
      res.end();
    }
  }
}
