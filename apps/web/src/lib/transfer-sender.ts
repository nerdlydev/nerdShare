import type { DCControlMessage, FileMeta } from "@nerdshare/shared";
import {
  readChunk,
  DEFAULT_CHUNK_SIZE,
  calculateTotalChunks,
} from "./file-chunker";
import type { TransferProgress } from "./transfer-progress";

export interface TransferSenderOptions {
  dc: RTCDataChannel;
  file: File;
  onProgress?: (progress: TransferProgress) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

// Backpressure thresholds
const HIGH_WATERMARK = 16 * 1024 * 1024; // 16MB
const LOW_WATERMARK = 4 * 1024 * 1024; // 4MB

export class TransferSender {
  private dc: RTCDataChannel;
  private file: File;
  private options: TransferSenderOptions;
  private isAborted = false;
  private startTime = 0;

  constructor(options: TransferSenderOptions) {
    this.dc = options.dc;
    this.file = options.file;
    this.options = options;
    this.dc.bufferedAmountLowThreshold = LOW_WATERMARK;
  }

  async start(): Promise<void> {
    this.startTime = Date.now();
    const fileId = crypto.randomUUID();
    const totalChunks = calculateTotalChunks(
      this.file.size,
      DEFAULT_CHUNK_SIZE,
    );

    const meta: FileMeta = {
      fileId,
      fileName: this.file.name,
      fileSize: this.file.size,
      mimeType: this.file.type || "application/octet-stream",
      chunkSize: DEFAULT_CHUNK_SIZE,
      totalChunks,
    };

    try {
      this.sendControl({ type: "FILE_META", ...meta });
      await this.waitForAck(fileId);

      for (let i = 0; i < totalChunks; i++) {
        if (this.isAborted) break;

        if (this.dc.bufferedAmount > HIGH_WATERMARK) {
          await this.waitForBufferDrain();
        }

        const buffer = await readChunk(this.file, i, DEFAULT_CHUNK_SIZE);
        this.dc.send(buffer);
        this.updateProgress(i + 1, totalChunks);
      }

      if (!this.isAborted) {
        this.sendControl({ type: "TRANSFER_COMPLETE", fileId });
        this.options.onComplete?.();
      }
    } catch (err) {
      if (this.isAborted) return;
      const msg = err instanceof Error ? err.message : String(err);
      this.options.onError?.(msg);
    }
  }

  abort(): void {
    this.isAborted = true;
  }

  private sendControl(msg: DCControlMessage): void {
    if (this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(msg));
    }
  }

  private waitForAck(fileId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.dc.removeEventListener("message", onMessage);
        reject(new Error("Timeout waiting for HELLO_ACK"));
      }, 10000);

      const onMessage = (event: MessageEvent) => {
        if (typeof event.data !== "string") return;
        try {
          const msg: DCControlMessage = JSON.parse(event.data);
          if (msg.type === "HELLO_ACK" && msg.fileId === fileId) {
            clearTimeout(timeout);
            this.dc.removeEventListener("message", onMessage);
            resolve();
          }
        } catch {}
      };

      this.dc.addEventListener("message", onMessage);
    });
  }

  private waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      const onLow = () => {
        this.dc.removeEventListener("bufferedamountlow", onLow);
        resolve();
      };
      this.dc.addEventListener("bufferedamountlow", onLow);
    });
  }

  private updateProgress(chunksSent: number, totalChunks: number): void {
    const bytesTransferred = Math.min(
      chunksSent * DEFAULT_CHUNK_SIZE,
      this.file.size,
    );
    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = elapsed > 0 ? bytesTransferred / elapsed : 0;
    const remainingBytes = this.file.size - bytesTransferred;
    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

    this.options.onProgress?.({
      progress: bytesTransferred / this.file.size,
      bytesTransferred,
      totalBytes: this.file.size,
      speed,
      timeRemaining,
      direction: "sending",
    });
  }
}
