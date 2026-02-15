import type { DCControlMessage, FileMeta } from "@nerdshare/shared";
import type { TransferProgress, TransferState } from "./transfer-progress";
import { SpeedTracker } from "./speed-tracker";

export interface TransferReceiverOptions {
  dc: RTCDataChannel;
  onFileMeta?: (meta: FileMeta) => void;
  onProgress?: (progress: TransferProgress) => void;
  onComplete?: (blob: Blob, meta: FileMeta) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: TransferState) => void;
}

export class TransferReceiver {
  private dc: RTCDataChannel;
  private options: TransferReceiverOptions;
  private currentMeta: FileMeta | null = null;
  private chunks: ArrayBuffer[] = [];
  private receivedBytes = 0;
  private accepted = false;
  private speedTracker = new SpeedTracker();
  private _state: TransferState = "idle";

  constructor(options: TransferReceiverOptions) {
    this.dc = options.dc;
    this.options = options;
    this.setupListeners();
  }

  // ── Public API ──

  get state(): TransferState {
    return this._state;
  }

  /** Called by the UI when the user clicks "Download" */
  acceptTransfer(): void {
    if (!this.currentMeta || this.accepted) return;
    this.accepted = true;
    this.speedTracker.reset();
    this.setState("transferring");
    this.sendControl({ type: "HELLO_ACK", fileId: this.currentMeta.fileId });
  }

  /** Clean up and reset state */
  destroy(): void {
    this.setState("idle");
    this.currentMeta = null;
    this.chunks = [];
    this.receivedBytes = 0;
  }

  // ── Listeners ──

  private setupListeners(): void {
    this.dc.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        this.handleControlMessage(event.data);
      } else {
        this.handleBinaryMessage(event.data);
      }
    });

    // Detect DataChannel close mid-transfer
    this.dc.addEventListener("close", () => {
      if (this._state === "transferring" || this._state === "paused") {
        this.setState("error");
        this.options.onError?.(
          `Connection lost — received ${this.chunks.length} of ${this.currentMeta?.totalChunks ?? "?"} chunks`,
        );
      }
    });

    this.dc.addEventListener("error", () => {
      if (this._state === "transferring" || this._state === "paused") {
        this.setState("error");
        this.options.onError?.("DataChannel error during transfer");
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
          this.speedTracker.reset();
          this.setState("idle");
          // Notify UI about the file — do NOT ack yet
          this.options.onFileMeta?.(msg);
          break;

        case "TRANSFER_COMPLETE":
          if (this.currentMeta && this.currentMeta.fileId === msg.fileId) {
            this.finishTransfer();
          }
          break;

        case "PAUSE":
          if (this._state === "transferring") {
            this.setState("paused");
          }
          break;

        case "RESUME":
          if (this._state === "paused") {
            this.setState("transferring");
          }
          break;

        case "CANCEL":
          this.setState("idle");
          this.options.onError?.("Transfer cancelled by sender");
          this.currentMeta = null;
          this.chunks = [];
          this.receivedBytes = 0;
          break;

        case "DC_ERROR":
          this.setState("error");
          this.options.onError?.(msg.message);
          break;
      }
    } catch {}
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    if (!this.currentMeta) return;

    this.chunks.push(data);
    this.receivedBytes += data.byteLength;
    this.speedTracker.addSample(data.byteLength);
    this.updateProgress();
  }

  private updateProgress(): void {
    if (!this.currentMeta) return;

    const speed = this.speedTracker.getSpeed();
    const remainingBytes = this.currentMeta.fileSize - this.receivedBytes;
    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

    this.options.onProgress?.({
      progress: this.receivedBytes / this.currentMeta.fileSize,
      bytesTransferred: this.receivedBytes,
      totalBytes: this.currentMeta.fileSize,
      speed,
      timeRemaining,
      direction: "receiving",
      state: this._state,
    });
  }

  private finishTransfer(): void {
    if (!this.currentMeta) return;

    this.setState("complete");

    const blob = new Blob(this.chunks, { type: this.currentMeta.mimeType });
    this.options.onComplete?.(blob, this.currentMeta);

    // Auto-save — user already consented by clicking Download
    this.triggerDownload(blob, this.currentMeta.fileName);

    this.currentMeta = null;
    this.chunks = [];
  }

  private triggerDownload(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  private sendControl(msg: DCControlMessage): void {
    if (this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(msg));
    }
  }

  private setState(state: TransferState): void {
    if (this._state === state) return;
    this._state = state;
    this.options.onStateChange?.(state);
  }
}
