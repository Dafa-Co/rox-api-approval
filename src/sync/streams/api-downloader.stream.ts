import { Transform, TransformCallback, TransformOptions } from "stream";
import { DriversFactory } from "src/Classes/DriversFactory";
import { publicEncrypt, constants } from "crypto";
import { IKey } from "../interfaces/key.interface";

export class ApiApprovalKeyDownloader extends Transform {
  private driversFactory: DriversFactory;
  private folderName: string;
  private concurrency: number;
  private continueCb: (() => void) | null = null;
  private terminateCb: (() => void) | null = null;
  private runningProcesses: number = 0;
  private clientConnected: boolean;

  /**
   * Handle client disconnection.
   */
  HandleClientDisconnect() {
    this.clientConnected = false;
  }

  constructor(
    driversFactory: DriversFactory,
    folderName: string,
    options: TransformOptions = {},
    parallelism: number = 10
  ) {
    super({ objectMode: true, ...options });
    this.concurrency = parallelism;
    this.driversFactory = driversFactory;
    this.folderName = folderName;
    this.clientConnected = true;
    this.continueCb = null;
    this.terminateCb = null;
  }

  /**
   * Callback after each transformation process completes.
   */
  _onComplete(err: any) {
    this.runningProcesses--;

    if (err) {
      console.error("Error during transformation:", err);
      if (this.clientConnected) {
        this.push(`data: {"error": "${err.message}"}\n\n`);
        this.terminateCb && this.terminateCb();
      }
    }

    const tempCb = this.continueCb;
    this.continueCb = null;
    tempCb && tempCb();


    if (this.runningProcesses === 0) {
      this.terminateCb && this.terminateCb();
    }
  }

  /**
   * Encrypt and push the file content.
   */
  async userTransform(
    file: string,
    push: (chunk: any) => void,
    onComplete: (err: any) => void
  ) {
    if (!this.clientConnected) {
      return onComplete(new Error("Client disconnected."));
    }

    try {
      const content = await this.driversFactory.getKey(this.folderName, file);
      const key: IKey = {
        keyId: file,
        content: content,
      }
      const stringObj = JSON.stringify(key);
      push(stringObj);
      onComplete(null);
    } catch (error) {
      if (error.Code === 'NoSuchKey') {
        // Indicate the file does not exist in the stream data
        const errorMessage = {
          keyId: file,
          content: "File not found",
        };
        push(JSON.stringify(errorMessage)); // Push "file not found" message
        onComplete(null); // Complete without error
      } else {
        onComplete(error); // Other errors should proceed as usual
      }
    }
  }

  /**
   * Transform function called by the stream.
   */
  async _transform(
    file: string,
    encoding: BufferEncoding,
    done: TransformCallback
  ) {
    this.runningProcesses++;

    // Execute the transformation for the given file
    this.userTransform(file, this.push.bind(this), this._onComplete.bind(this));

    // Handle concurrency limits
    if (this.runningProcesses < this.concurrency) {
      done();
    } else {
      this.continueCb = done;
    }
  }

  _flush(done: TransformCallback): void {
    if(this.runningProcesses > 0) {
      this.terminateCb = done;
    } else {
      done();
    }
  }

}
