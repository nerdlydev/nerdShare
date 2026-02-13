// Shared progress type used by both sender and receiver for uniform UI rendering
export interface TransferProgress {
  /** 0 to 1 */
  progress: number;
  bytesTransferred: number;
  totalBytes: number;
  /** bytes per second */
  speed: number;
  /** seconds */
  timeRemaining: number;
  direction: "sending" | "receiving";
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatTime(seconds: number): string {
  if (seconds < 1) return "< 1s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}
