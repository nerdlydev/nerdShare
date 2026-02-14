import type { DCControlMessage, FileMeta } from "@nerdshare/shared";
import type { TransferProgress } from "./transfer-progress";

export interface TransferReceiverOptions {
  dc: RTCDataChannel;
  onFileMeta?: (meta: FileMeta) => void;
  onProgress?: (progress: TransferProgress) => void;
  onComplete?: (blob: Blob, meta: FileMeta) => void;
  onError?: (error: string) => void;
}

export class TransferReceiver {
  private dc: RTCDataChannel;
  private options: TransferReceiverOptions;
  private currentMeta: FileMeta | null = null;
  private chunks: ArrayBuffer[] = [];
  private receivedBytes = 0;
  private startTime = 0;
  private accepted = false;

  constructor(options: TransferReceiverOptions) {
    this.dc = options.dc;
    this.options = options;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.dc.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        this.handleControlMessage(event.data);
      } else {
        this.handleBinaryMessage(event.data);
      }
    });
  }

  private handleControlMessage(data: string): void {
    try {
      const msg: DCControlMessage = JSON.parse(data);

      switch (msg.type) {
        case "FILE_META":
          this.currentMeta = msg;
          this.chunks = [];
          this.receivedBytes = 0;
          this.accepted = false;
          // Notify UI about the file — do NOT ack yet
          this.options.onFileMeta?.(msg);
          break;

        case "TRANSFER_COMPLETE":
          if (this.currentMeta && this.currentMeta.fileId === msg.fileId) {
            this.finishTransfer();
          }
          break;

        case "DC_ERROR":
          this.options.onError?.(msg.message);
          break;
      }
    } catch {}
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    if (!this.currentMeta) return;

    this.chunks.push(data);
    this.receivedBytes += data.byteLength;
    this.updateProgress();
  }

  private updateProgress(): void {
    if (!this.currentMeta) return;

    const elapsed = (Date.now() - this.startTime) / 1000;
    const speed = elapsed > 0 ? this.receivedBytes / elapsed : 0;
    const remainingBytes = this.currentMeta.fileSize - this.receivedBytes;
    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

    this.options.onProgress?.({
      progress: this.receivedBytes / this.currentMeta.fileSize,
      bytesTransferred: this.receivedBytes,
      totalBytes: this.currentMeta.fileSize,
      speed,
      timeRemaining,
      direction: "receiving",
    });
  }

  /** Called by the UI when the user clicks "Download" */
  acceptTransfer(): void {
    if (!this.currentMeta || this.accepted) return;
    this.accepted = true;
    this.startTime = Date.now();
    this.sendControl({ type: "HELLO_ACK", fileId: this.currentMeta.fileId });
  }

  private finishTransfer(): void {
    if (!this.currentMeta) return;

    const blob = new Blob(this.chunks, { type: this.currentMeta.mimeType });
    this.options.onComplete?.(blob, this.currentMeta);
    // No auto-download — the PeerView handles saving via a button

    this.currentMeta = null;
    this.chunks = [];
  }

  private sendControl(msg: DCControlMessage): void {
    if (this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(msg));
    }
  }
}
