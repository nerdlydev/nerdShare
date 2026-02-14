import { useRef, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/PageLayout";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Copy01Icon,
  Cancel01Icon,
  FileIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import type { ConnectionState } from "@/lib/webrtc-manager";
import type { TransferProgress } from "@/lib/transfer-progress";
import { formatBytes, formatTime } from "@/lib/transfer-progress";
import { TransferSender } from "@/lib/transfer-sender";
import QRCode from "qrcode";

interface HostViewProps {
  file: File;
  shareUrl: string;
  connectionState: ConnectionState;
  dc: RTCDataChannel | null;
  onLeave: () => void;
  logs: string[];
}

export function HostView({
  file,
  shareUrl,
  connectionState,
  dc,
  onLeave,
  logs,
}: HostViewProps) {
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);
  const senderRef = useRef<TransferSender | null>(null);
  const hasStartedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isConnected = connectionState === "connected";

  // Generate QR code
  useEffect(() => {
    QRCode.toDataURL(shareUrl, {
      width: 140,
      margin: 2,
      color: { dark: "#ffffff", light: "#00000000" },
    }).then(setQrDataUrl);
  }, [shareUrl]);

  // Auto-start transfer when DataChannel opens
  const startTransfer = useCallback(async () => {
    if (!dc || isTransferring || hasStartedRef.current) return;
    hasStartedRef.current = true;
    setIsTransferring(true);
    setTransferComplete(false);

    const sender = new TransferSender({
      dc,
      file,
      onProgress: (p) => setProgress(p),
      onComplete: () => {
        setIsTransferring(false);
        setTransferComplete(true);
      },
      onError: () => {
        setIsTransferring(false);
        hasStartedRef.current = false;
      },
    });
    senderRef.current = sender;
    await sender.start();
  }, [dc, file, isTransferring]);

  useEffect(() => {
    if (isConnected && dc && !hasStartedRef.current) {
      startTransfer();
    }
  }, [isConnected, dc, startTransfer]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <PageLayout
      panel={
        <div className="bg-card/50 rounded-2xl p-6 border border-border relative">
          {/* Close button */}
          <button
            onClick={onLeave}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>

          {/* File info */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-0.5">
              <HugeiconsIcon
                icon={FileIcon}
                size={16}
                className="text-primary"
              />
              <p className="text-sm font-medium truncate">{file.name}</p>
            </div>
            <p className="text-xs text-muted-foreground ml-6">
              {formatBytes(file.size)}
            </p>
          </div>

          {/* Share link */}
          <div className="flex items-center gap-1.5 mb-5">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 text-xs font-mono bg-muted/50 border border-border rounded-lg px-2.5 py-2 text-primary truncate focus:outline-none cursor-text"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={copyLink}
              className="shrink-0"
            >
              <HugeiconsIcon icon={Copy01Icon} size={14} />
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>

          {/* QR Code */}
          {qrDataUrl && (
            <div className="flex justify-center mb-5">
              <img src={qrDataUrl} alt="Share QR Code" className="w-28 h-28" />
            </div>
          )}

          {/* Progress */}
          {progress && (
            <div className="flex flex-col gap-1.5 mb-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{Math.round(progress.progress * 100)}%</span>
                <span>{formatBytes(progress.speed)}/s</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    progress.progress >= 1 ? "bg-green-500" : "animate-shimmer"
                  }`}
                  style={{
                    width: `${Math.min(progress.progress * 100, 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progress.progress >= 1
                  ? "Transfer complete!"
                  : `${formatTime(progress.timeRemaining)} remaining`}
              </p>
            </div>
          )}

          {transferComplete && (
            <div className="flex items-center justify-center gap-1.5 text-sm text-green-400 font-medium">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
              Done! You can close this tab.
            </div>
          )}

          {/* Debug log */}
          <details className="text-xs mt-4">
            <summary className="text-muted-foreground cursor-pointer select-none mb-1.5">
              Debug Log
            </summary>
            <div className="bg-background/50 border border-border rounded-lg p-2 max-h-32 overflow-y-auto font-mono text-[10px] text-muted-foreground/70 space-y-0.5">
              {logs.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </details>
        </div>
      }
      hero={
        <div>
          {transferComplete ? (
            <>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-4">
                Transfer completed successfully!
              </h1>
              <p className="text-muted-foreground text-base leading-relaxed mb-6">
                Your file has been downloaded by the receiver. You can close
                this page or share another file.
              </p>
              <Button variant="outline" onClick={onLeave} className="gap-2">
                <HugeiconsIcon icon={RepeatIcon} size={16} />
                Share again?
              </Button>
            </>
          ) : (
            <>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-4">
                {isConnected
                  ? "Now sharing your files directly from your device"
                  : "Ready to share"}
              </h1>
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-6">
                <div className="flex items-center gap-1.5 text-sm font-medium text-destructive mb-1">
                  <HugeiconsIcon icon={Alert02Icon} size={16} />
                  Please note:
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Closing this page means you stop sharing! Simply keep this
                  page open in the background to keep sharing.
                </p>
              </div>
            </>
          )}
        </div>
      }
    />
  );
}
