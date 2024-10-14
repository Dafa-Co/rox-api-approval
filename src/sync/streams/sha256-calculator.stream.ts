import { Transform, TransformCallback, TransformOptions } from "stream";
import { createHash } from "crypto";
import { HashedKey, IKey } from "../interfaces/key.interface";

export class SHA256CalculatorStream extends Transform {
  constructor(options: TransformOptions = {}) {
    super({ objectMode: true, ...options });
  }

  _transform(
    chunk: string,
    encoding: BufferEncoding,
    done: TransformCallback
  ) {
    try {
      const data: IKey = JSON.parse(chunk); // Parse JSON string

      const hash = createHash("sha256").update(chunk).digest("hex");

      const dataToCompress: HashedKey = {
        hash,
        content: data.content,
        keyId: data.keyId,
      }

      // Push the result as a JSON string
      this.push(JSON.stringify(dataToCompress));
      done();
    } catch (error) {
      done(error);
    }
  }
}
