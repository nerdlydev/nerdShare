import type { DCControlMessage, FileMeta } from "@nerdshare/shared";
import {
  readChunk,
  DEFAULT_CHUNK_SIZE,
  calculateTotalChunks,
} from "./file-chunker";
import type { TransferProgress, TransferState } from "./transfer-progress";
import { SpeedTracker } from "./speed-tracker";

export interface TransferSenderOptions {
  dc: RTCDataChannel;
  file: File;
  onProgress?: (progress: TransferProgress) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onStateChange?: (state: TransferState) => void;
}

// Backpressure thresholds — must stay well below Chrome's ~16 MB SCTP hard limit
const HIGH_WATERMARK = 4 * 1024 * 1024; // 4 MB — pause sending
const LOW_WATERMARK = 512 * 1024; //  512 KB — resume sending

// Adaptive rate — slow down when speed drops
const ADAPTIVE_DELAY_THRESHOLD = 500 * 1024; // below 500 KB/s → add delay
const ADAPTIVE_DELAY_MS = 10; // small yield to avoid flooding

// Yield to event loop every N chunks to let browser flush SCTP buffer
const YIELD_EVERY_N_CHUNKS = 16;

export class TransferSender {
  private dc: RTCDataChannel;
  private file: File;
  private options: TransferSenderOptions;
  private fileId = "";
  private totalChunks = 0;
  private lastSentChunk = -1;
  private speedTracker = new SpeedTracker();

  // ── State Machine ──
  private _state: TransferState = "idle";

  // ── Pause Machinery ──
  private pausePromise: Promise<void> | null = null;
  private pauseResolve: (() => void) | null = null;

  constructor(options: TransferSenderOptions) {
    this.dc = options.dc;
    this.file = options.file;
    this.options = options;
    this.dc.bufferedAmountLowThreshold = LOW_WATERMARK;
  }

  // ── Public API ──

  get state(): TransferState {
    return this._state;
  }

  async start(): Promise<void> {
    this.fileId = crypto.randomUUID();
    this.totalChunks = calculateTotalChunks(this.file.size, DEFAULT_CHUNK_SIZE);
    this.lastSentChunk = -1;
    this.speedTracker.reset();
    this.setState("transferring");

    const meta: FileMeta = {
      fileId: this.fileId,
      fileName: this.file.name,
      fileSize: this.file.size,
      mimeType: this.file.type || "application/octet-stream",
      chunkSize: DEFAULT_CHUNK_SIZE,
      totalChunks: this.totalChunks,
    };

    try {
      await this.negotiateHandshake(meta);
      await this.sendChunks(0);
    } catch (err) {
      if (this._state === "cancelled") return; // cancelled
      const msg = err instanceof Error ? err.message : String(err);
      this.setState("error");
      this.options.onError?.(msg);
    }
  }

  /** Retry from the last successfully sent chunk */
  async retry(): Promise<void> {
    if (this._state !== "error") return;
    this.setState("transferring");
    this.speedTracker.reset();
    try {
      await this.sendChunks(this.lastSentChunk + 1);
    } catch (err) {
      if ((this._state as TransferState) === "cancelled") return;
      const msg = err instanceof Error ? err.message : String(err);
      this.setState("error");
      this.options.onError?.(msg);
    }
  }

  pause(): void {
    if (this._state !== "transferring") return;
    this.setState("paused");
    this.pausePromise = new Promise((resolve) => {
      this.pauseResolve = resolve;
    });
    this.sendControl({ type: "PAUSE", fileId: this.fileId });
  }

  resume(): void {
    if (this._state !== "paused") return;
    this.setState("transferring");
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }
    this.sendControl({ type: "RESUME", fileId: this.fileId });
  }

  cancel(): void {
    const wasActive =
      this._state === "transferring" || this._state === "paused";
    this.setState("idle");
    // Unblock pause if paused
    if (this.pauseResolve) {
      this.pauseResolve();
      this.pauseResolve = null;
      this.pausePromise = null;
    }
    if (wasActive) {
      this.sendControl({ type: "CANCEL", fileId: this.fileId });
    }
  }

  // ── Core Send Loop ──

  private async sendChunks(fromChunk: number): Promise<void> {
    for (let i = fromChunk; i < this.totalChunks; i++) {
      // Check cancellation
      if (this._state === "idle") return;

      // Check pause
      if (this.pausePromise) {
        await this.pausePromise;
        // After resume, re-check if cancelled during pause
        if (this._state === "cancelled") return;
      }

      // Backpressure: wait if DC buffer is getting full
      if (this.dc.bufferedAmount > HIGH_WATERMARK) {
        await this.waitForBufferDrain();
      }

      // Check DC is still open
      if (this.dc.readyState !== "open") {
        throw new Error("DataChannel closed unexpectedly");
      }

      const buffer = await readChunk(this.file, i, DEFAULT_CHUNK_SIZE);
      await this.safeSend(buffer);
      this.lastSentChunk = i;
      this.speedTracker.addSample(buffer.byteLength);
      this.updateProgress(i + 1);

      // Periodic yield — let browser flush SCTP buffer
      if ((i - fromChunk) % YIELD_EVERY_N_CHUNKS === YIELD_EVERY_N_CHUNKS - 1) {
        await sleep(0);
      }

      // Adaptive rate: yield briefly when speed is very low
      const speed = this.speedTracker.getSpeed();
      if (speed > 0 && speed < ADAPTIVE_DELAY_THRESHOLD) {
        await sleep(ADAPTIVE_DELAY_MS);
      }
    }

    if (this._state === "transferring") {
      this.sendControl({ type: "TRANSFER_COMPLETE", fileId: this.fileId });
      this.setState("complete");
      this.options.onComplete?.();
    }
  }

  // ── Helpers ──

  /** Send with retry if the browser's hard queue limit is hit */
  private async safeSend(data: ArrayBuffer): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        this.dc.send(data);
        return;
      } catch (err) {
        // "RTCDataChannel send queue is full" — wait for drain and retry
        if (err instanceof DOMException && err.name === "OperationError") {
          console.warn(
            `[sender] send queue full (buffered=${this.dc.bufferedAmount}), waiting for drain…`,
          );
          await this.waitForBufferDrain();
          continue;
        }
        throw err; // different error — let it bubble
      }
    }
    throw new Error("Failed to send chunk after 3 retries");
  }

  private sendControl(msg: DCControlMessage): void {
    if (this.dc.readyState === "open") {
      this.dc.send(JSON.stringify(msg));
    }
  }

  private negotiateHandshake(meta: FileMeta): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const pingInterval = setInterval(() => {
        if (this.dc.readyState === "open") {
          this.dc.send(JSON.stringify({ type: "FILE_META", ...meta }));
        }
        attempts++;
        if (attempts > 120) {
          // 1 minute total (120 * 500ms)
          clearInterval(pingInterval);
          this.dc.removeEventListener("message", onMessage);
          reject(new Error("Timeout waiting for HELLO_ACK"));
        }
      }, 500);

      const onMessage = (event: MessageEvent) => {
        if (typeof event.data !== "string") return;
        try {
          const msg: DCControlMessage = JSON.parse(event.data);
          if (msg.type === "HELLO_ACK" && msg.fileId === this.fileId) {
            clearInterval(pingInterval);
            this.dc.removeEventListener("message", onMessage);
            resolve();
          }
        } catch {}
      };

      this.dc.addEventListener("message", onMessage);

      // Fire first ping immediately
      if (this.dc.readyState === "open") {
        this.dc.send(JSON.stringify({ type: "FILE_META", ...meta }));
      }
    });
  }

  private waitForBufferDrain(): Promise<void> {
    return new Promise((resolve) => {
      // Already drained? Resolve immediately.
      if (this.dc.bufferedAmount <= LOW_WATERMARK) {
        resolve();
        return;
      }

      let resolved = false;
      const done = () => {
        if (resolved) return;
        resolved = true;
        this.dc.removeEventListener("bufferedamountlow", onLow);
        clearInterval(pollId);
        resolve();
      };

      const onLow = () => done();
      this.dc.addEventListener("bufferedamountlow", onLow);

      // Polling safety net — the event may have fired between check and listen
      const pollId = setInterval(() => {
        if (this.dc.bufferedAmount <= LOW_WATERMARK) done();
      }, 50);

      // Double-check right after attaching listener (race window)
      if (this.dc.bufferedAmount <= LOW_WATERMARK) done();
    });
  }

  private updateProgress(chunksSent: number): void {
    const bytesTransferred = Math.min(
      chunksSent * DEFAULT_CHUNK_SIZE,
      this.file.size,
    );
    const speed = this.speedTracker.getSpeed();
    const remainingBytes = this.file.size - bytesTransferred;
    const timeRemaining = speed > 0 ? remainingBytes / speed : 0;

    this.options.onProgress?.({
      progress: bytesTransferred / this.file.size,
      bytesTransferred,
      totalBytes: this.file.size,
      speed,
      timeRemaining,
      direction: "sending",
      state: this._state,
    });
  }

  private setState(state: TransferState): void {
    if (this._state === state) return;
    this._state = state;
    this.options.onStateChange?.(state);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
