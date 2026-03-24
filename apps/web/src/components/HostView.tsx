import { useRef, useCallback, useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { CopyIcon } from "@/components/ui/copy";
import { CheckIcon } from "@/components/ui/check";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  RepeatIcon,
} from "@hugeicons/core-free-icons";
import { CircleCheckIcon } from "@/components/ui/circle-check";
import { AttachFileIcon } from "@/components/ui/attach-file";
import { XIcon } from "@/components/ui/x";
import type { ConnectionState } from "@/lib/webrtc-manager";
import type { TransferProgress } from "@/lib/transfer-progress";
import type { TransferState } from "@/lib/transfer-progress";
import { formatBytes, formatTime } from "@/lib/transfer-progress";
import { TransferSender } from "@/lib/transfer-sender";
import QRCode from "qrcode";
import { useLogs } from "@/lib/logs-context";
import { useWakeLock } from "@/lib/use-wake-lock";
import { useViteTheme } from "@space-man/react-theme-animation";

// ── Isolated debug log reads from context ──
const DebugLog = memo(function DebugLog() {
  const logs = useLogs();
  return (
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
  );
});

interface HostViewProps {
  file: File;
  shareUrl: string;
  isNearby?: boolean;
  connectionState: ConnectionState;
  dc: RTCDataChannel | null;
  onLeave: () => void;
}

export const HostView = memo(function HostView({
  file,
  shareUrl,
  isNearby = false,
  connectionState,
  dc,
  onLeave,
}: HostViewProps) {
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [transferState, setTransferState] = useState<TransferState>("idle");
  const senderRef = useRef<TransferSender | null>(null);
  const hasStartedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const { acquire: wakeLockAcquire, release: wakeLockRelease } = useWakeLock();

  const isConnected = connectionState === "connected";
  const isTransferring = transferState === "transferring";
  const isPaused = transferState === "paused";
  const isError = transferState === "error";
  const isComplete = transferState === "complete";

  const { resolvedTheme } = useViteTheme();

  // Generate QR code
  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    QRCode.toDataURL(shareUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: isDark ? "#ffffff" : "#1f2937", // pixels
        light: "#00000000", // transparent
      },
    }).then(setQrDataUrl);
  }, [shareUrl, resolvedTheme]);

  // Auto-start transfer when DataChannel opens
  const startTransfer = useCallback(async () => {
    if (!dc || isTransferring || hasStartedRef.current) return;
    hasStartedRef.current = true;

    const sender = new TransferSender({
      dc,
      file,
      onProgress: (p) => setProgress(p),
      onComplete: () => {},
      onError: (err) => {
        console.error(`[HostView] Transfer error: ${err} - Failing silently.`);
        hasStartedRef.current = false;
        wakeLockRelease();
      },
      onStateChange: (state) => {
        if ((state as string) === "failed" || (state as string) === "disconnected") {
          setTransferState("error" as any);
        } else {
          setTransferState(state);
        }
        if (state === "transferring") wakeLockAcquire();
        if (state === "complete" || (state as string) === "failed" || (state as string) === "disconnected") wakeLockRelease();
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

  const handlePause = () => senderRef.current?.pause();
  const handleResume = () => senderRef.current?.resume();
  const handleCancel = () => {
    senderRef.current?.cancel();
    hasStartedRef.current = false;
  };

  // Status label for the progress section
  const statusLabel = isPaused
    ? "Paused"
    : isError
      ? "Transfer failed"
      : isComplete
        ? "Transfer complete!"
        : `${formatTime(progress?.timeRemaining ?? 0)} remaining`;

  return (
    <PageLayout
      panel={
        <div className="relative group">
          <AnimatePresence mode="wait">
            <motion.div
              key={transferState}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card/40 backdrop-blur-xl rounded-[2.5rem] p-8 border-2 border-dashed border-border/60 shadow-2xl shadow-primary/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

              <button
                onClick={onLeave}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
              >
                <XIcon size={20} />
              </button>

              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">
                  {isComplete ? "Success" : "Sharing File"}
                </p>
                <div className="flex items-center gap-4">
                  <div className="text-primary">
                    <AttachFileIcon size={32} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold truncate">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
              </div>
              {!isNearby && !isTransferring && !isComplete && !isPaused && (
                <div className="space-y-6">
                  <div className="relative group/link">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="w-full text-sm font-mono bg-muted/40 border-2 border-dashed border-border rounded-2xl px-4 py-4 pr-14 text-primary focus:outline-none cursor-text transition-all group-hover/link:border-primary/30"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <div className="absolute right-2 top-2">
                       <Button
                        size="icon"
                        variant={copied ? "default" : "secondary"}
                        onClick={copyLink}
                        className="rounded-xl h-10 w-10 border-none transition-all"
                      >
                        <AnimatePresence mode="wait" initial={false}>
                          {copied ? (
                            <motion.div
                              key="check"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CheckIcon size={18} />
                            </motion.div>
                          ) : (
                            <motion.div
                              key="copy"
                              initial={{ opacity: 0, scale: 0.5 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.5 }}
                              transition={{ duration: 0.2 }}
                            >
                              <CopyIcon size={18} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Button>
                    </div>
                  </div>

                  {qrDataUrl && (
                    <div className="bg-muted/80 backdrop-blur-sm p-6 rounded-[2rem] flex justify-center w-fit mx-auto m-1 border-2 border-dashed border-border/40">
                      <img 
                        src={qrDataUrl} 
                        alt="Share QR Code" 
                        className="w-48 h-48 rounded-xl" 
                      />
                    </div>
                  )}
                </div>
              )}

              {progress && !isComplete && (
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-primary">{Math.round(progress.progress * 100)}%</span>
                    <span className="text-muted-foreground font-mono">
                      {isPaused ? "PAUSED" : `${formatBytes(progress.speed)}/s`}
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden relative">
                    <motion.div
                      layout
                      className={`h-full rounded-full transition-all duration-300 ${
                        isError ? "bg-destructive" : isPaused ? "bg-yellow-500" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(progress.progress * 100, 100)}%` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  </div>
                  <p className={`text-xs font-medium ${isPaused ? "text-yellow-500" : "text-muted-foreground"}`}>
                    {statusLabel}
                  </p>
                </div>
              )}

              {(isTransferring || isPaused) && (
                <div className="flex items-center gap-3 mt-8">
                  <Button
                    onClick={isTransferring ? handlePause : handleResume}
                    variant="outline"
                    className="flex-1 py-6 rounded-2xl text-base font-bold"
                  >
                    {isTransferring ? "Pause Transfer" : "Resume Transfer"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="ghost"
                    className="px-6 py-6 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <XIcon size={20} />
                  </Button>
                </div>
              )}

              {isComplete && (
                <div className="mt-4">
                  <div className="flex items-center justify-center text-primary mb-6">
                    <CircleCheckIcon size={48} />
                  </div>
                  <p className="text-primary font-bold text-lg mb-2">Transfer Successful!</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The file has been successfully delivered and saved on the receiver's device.
                  </p>
                </div>
              )}

              {transferState === ("error" as any) && (
                <div className="mt-4 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive">
                    <HugeiconsIcon icon={Alert02Icon} size={32} />
                  </div>
                  <p className="text-destructive font-bold text-lg mb-2">Connection Lost</p>
                  <p className="text-sm text-muted-foreground mb-8 text-balance">
                    The connection was interrupted. This usually happens when a peer closes their tab or the network times out.
                  </p>
                  <Button 
                     variant="outline" 
                     className="w-full py-6 rounded-2xl font-bold" 
                     onClick={onLeave}
                  >
                     Restart Sharing
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <DebugLog />
        </div>
      }
      hero={
        <motion.div
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Active Host
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-6 text-balance">
            {isComplete ? "Sharing successful" : (isConnected ? "Connected & Sharing" : "Waiting for receiver")}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed text-balance">
            {isComplete 
              ? "Your files have been safely delivered. You can now close this tab or share another file."
              : "Keep this page open while the transfer is in progress. Closing it will terminate the connection immediately."}
          </p>
          
          {isComplete && (
             <Button variant="outline" onClick={onLeave} className="mt-8 py-6 px-8 rounded-2xl font-bold gap-2">
               <HugeiconsIcon icon={RepeatIcon} size={20} />
               Share Another File
             </Button>
          )}

          {!isComplete && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-3xl p-6 mt-12">
               <div className="flex items-center gap-2 text-sm font-bold text-destructive mb-2 uppercase tracking-wide">
                 <HugeiconsIcon icon={Alert02Icon} size={18} />
                 Sharing Note
               </div>
               <p className="text-sm text-muted-foreground/80 leading-relaxed">
                 nerdShare is a direct device-to-device service. We don't store your files on any cloud. 
                 To ensure the transfer completes, do not close this browser tab.
               </p>
            </div>
          )}
        </motion.div>
      }
    />
  );
});
