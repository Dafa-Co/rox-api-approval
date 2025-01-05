import { pipeline, Transform, TransformOptions, Readable } from "stream";
import { promisify } from "util";
import { createGzip } from "zlib";
import { ApiApprovalKeyDownloader } from "./api-downloader.stream";
import { SHA256CalculatorStream } from "./sha256-calculator.stream";
import { EncryptionStream } from "./encypt.stream";

// Promisify the Node.js pipeline function for better async handling
const pipelineAsync = promisify(pipeline);

export class CombinedProcessingStream extends Transform {
  constructor(
    private driversFactory: any,
    private folderName: string,
    private publicKey: string,
    private concurrency: number = 10,
    options: TransformOptions = {}
  ) {
    super({ ...options, objectMode: true });
  }

  /**
   * Internal pipeline that connects all processing streams.
   * @param source The source readable stream.
   */
  private async internalPipeline(source: Readable) {
    const downloader = new ApiApprovalKeyDownloader(
      this.driversFactory,
      this.folderName,
      {},
      this.concurrency
    );
    const sha256Calculator = new SHA256CalculatorStream();
    const compressor = createGzip(); // Compress with Gzip
    // const encryptor = new EncryptionStream(this.publicKey,); // Encrypt the data

    // Use pipelineAsync to connect streams with proper backpressure handling
    await pipelineAsync(
      source,         // Readable stream of files
      downloader,     // Download files concurrently
      sha256Calculator, // Calculate SHA-256 hash
      compressor,     // Compress the data
      // encryptor,      // Encrypt the data
      this            // Output the encrypted data
    );
  }

  /**
   * Process the source stream through the internal pipeline.
   * @param source The source readable stream to process.
   */
  async process(source: Readable) {
    try {
      await this.internalPipeline(source);
    } catch (error) {
      this.destroy(error); // Handle stream errors by destroying the stream
    }
  }

  _transform(chunk: any, encoding: BufferEncoding, done: () => void) {
    this.push(chunk); // Push the final processed chunk to the output
    done();
  }
}
