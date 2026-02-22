import type { ClientMessage, ServerMessage } from "@nerdshare/shared";

// ─── Types ───

export type SignalingStatus = "disconnected" | "connecting" | "connected";

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: SignalingStatus) => void;

interface SignalingClientOptions {
  url: string;
  onMessage: MessageHandler;
  onStatusChange?: StatusHandler;
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

// ─── Signaling Client ───

export class SignalingClient {
  private ws: WebSocket | null = null;
  private options: Required<SignalingClientOptions>;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private _status: SignalingStatus = "disconnected";

  constructor(options: SignalingClientOptions) {
    this.options = {
      maxRetries: 5,
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      onStatusChange: () => {},
      ...options,
    };
  }

  // ── Public API ──

  get status(): SignalingStatus {
    return this._status;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.intentionalClose = false;
    this.createConnection();
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[signaling] cannot send — not connected", msg.type);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  disconnect(): void {
    this.intentionalClose = true;
    this.clearRetryTimer();
    this.retryCount = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }

  // ── Private ──

  private createConnection(): void {
    this.setStatus("connecting");

    try {
      this.ws = new WebSocket(this.options.url);
    } catch (err) {
      console.error("[signaling] failed to create WebSocket", err);
      this.scheduleRetry();
      return;
    }

    this.ws.onopen = () => {
      console.log("[signaling] connected");
      this.retryCount = 0;
      this.setStatus("connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        // Handle PING internally — reply immediately & don't bubble to handlers
        if (msg.type === "PING") {
          this.send({ type: "PONG", timestamp: msg.timestamp });
          return;
        }

        this.options.onMessage(msg);
      } catch (err) {
        console.error("[signaling] failed to parse message", err);
      }
    };

    this.ws.onclose = (event) => {
      console.log(
        `[signaling] closed (code=${event.code}, reason=${event.reason})`,
      );
      this.ws = null;
      this.setStatus("disconnected");

      if (!this.intentionalClose) {
        this.scheduleRetry();
      }
    };

    this.ws.onerror = (event) => {
      console.error("[signaling] WebSocket error", event);
      // onclose will fire after onerror — retry happens there
    };
  }

  private scheduleRetry(): void {
    if (this.retryCount >= this.options.maxRetries) {
      console.warn(
        `[signaling] max retries (${this.options.maxRetries}) exceeded`,
      );
      return;
    }

    const delay = Math.min(
      this.options.baseDelayMs * Math.pow(2, this.retryCount),
      this.options.maxDelayMs,
    );

    console.log(
      `[signaling] retrying in ${delay}ms (attempt ${this.retryCount + 1}/${this.options.maxRetries})`,
    );

    this.retryTimer = setTimeout(() => {
      this.retryCount++;
      this.createConnection();
    }, delay);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private setStatus(status: SignalingStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.options.onStatusChange!(status);
  }
}
