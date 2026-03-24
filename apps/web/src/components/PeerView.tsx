import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { PageLayout } from "@/components/PageLayout";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { CircleCheckIcon } from "@/components/ui/circle-check";
import { AttachFileIcon } from "@/components/ui/attach-file";
import { DownloadIcon } from "@/components/ui/download";
import { XIcon } from "@/components/ui/x";
import { WifiIcon } from "@/components/ui/wifi";
import type { ConnectionState } from "@/lib/webrtc-manager";
import type { TransferProgress } from "@/lib/transfer-progress";
import { formatBytes, formatTime } from "@/lib/transfer-progress";
import { TransferReceiver } from "@/lib/transfer-receiver";
import type { FileMeta } from "@nerdshare/shared";
import { useLogs } from "@/lib/logs-context";
import { useWakeLock } from "@/lib/use-wake-lock";

type PeerState =
  | "connecting"
  | "waiting"
  | "ready"
  | "downloading"
  | "paused"
  | "done"
  | "error";

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

interface PeerViewProps {
  connectionState: ConnectionState;
  dc: RTCDataChannel | null;
  addLog: (msg: string) => void;
  onLeave: () => void;
}

export const PeerView = memo(function PeerView({
  connectionState,
  dc,
  addLog,
  onLeave,
}: PeerViewProps) {
  const [peerState, setPeerState] = useState<PeerState>("connecting");
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [fileMeta, setFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  const receiverRef = useRef<TransferReceiver | null>(null);
  const { acquire: wakeLockAcquire, release: wakeLockRelease } = useWakeLock();

  const isConnected = connectionState === "connected";

  useEffect(() => {
    if (isConnected) setPeerState("waiting");
    if (connectionState === "disconnected" || connectionState === "failed") {
      console.warn(
        `[PeerView] Connection state: ${connectionState}. Failing silently.`,
      );
    }
  }, [isConnected, connectionState]);

  // Start receiver when DataChannel opens
  useEffect(() => {
    if (!dc || dc.readyState !== "open") return;

    const receiver = new TransferReceiver({
      dc,
      onFileMeta: (meta) => {
        setFileMeta({ name: meta.fileName, size: meta.fileSize });
        setPeerState("ready");
        addLog(
          ` file offered: ${meta.fileName} (${formatBytes(meta.fileSize)})`,
        );
      },
      onProgress: (p) => {
        setProgress(p);
        if (p.progress > 0 && p.progress < 1 && peerState !== "paused") {
          setPeerState("downloading");
        }
      },
      onComplete: (blob: Blob, meta: FileMeta) => {
        setFileMeta({ name: meta.fileName, size: meta.fileSize });
        setDownloadBlob(blob);
        setPeerState("done");
        addLog(`received: ${meta.fileName}`);
        wakeLockRelease();
      },
      onError: (err) => {
        addLog(` error: ${err}`);
        console.error(`[PeerView] Transfer error: ${err} - Failing silently.`);
        wakeLockRelease();
      },
      onStateChange: (state) => {
        if (state === "paused") setPeerState("paused");
        if (state === "transferring") {
          setPeerState("downloading");
          wakeLockAcquire();
        }
        if (state === "complete") {
          wakeLockRelease();
        }
        if (state === "error") {
          wakeLockRelease();
          console.error("[PeerView] State changed to error, failing silently.");
        }
      },
    });

    receiverRef.current = receiver;

    return () => {
      receiverRef.current = null;
    };
  }, [dc, dc?.readyState, addLog]);

  const triggerDownload = useCallback(() => {
    if (!downloadBlob || !fileMeta) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileMeta.name;
    a.click();
    URL.revokeObjectURL(url);
  }, [downloadBlob, fileMeta]);

  // File info block (reused across states)
  const fileInfoBlock = fileMeta && (
    <div className="flex items-center gap-2 mb-4">
      <AttachFileIcon size={18} className="text-primary" />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{fileMeta.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(fileMeta.size)}
        </p>
      </div>
    </div>
  );

  // Progress bar block (reused across downloading/paused states)
  const progressBlock = progress && (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{Math.round(progress.progress * 100)}%</span>
        <span>
          {peerState === "paused" ? "—" : `${formatBytes(progress.speed)}/s`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-150 ${
            peerState === "paused" ? "bg-yellow-500" : "animate-shimmer"
          }`}
          style={{
            width: `${Math.min(progress.progress * 100, 100)}%`,
          }}
        />
      </div>
      <p
        className={`text-xs ${peerState === "paused" ? "text-yellow-500" : "text-muted-foreground"}`}
      >
        {peerState === "paused"
          ? "Sender paused the transfer"
          : `${formatTime(progress.timeRemaining)} remaining`}
      </p>
    </div>
  );

  const renderPanel = () => {
    switch (peerState) {
      case "connecting":
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
              <HugeiconsIcon
                icon={Loading03Icon}
                size={48}
                className="text-primary animate-spin-slow relative z-10"
              />
            </div>
            <p className="text-lg font-bold mb-2">Connecting...</p>
            <p className="text-sm text-muted-foreground">
              Establishing a secure peer-to-peer connection
            </p>
          </div>
        );

      case "waiting":
        return (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
              <HugeiconsIcon
                icon={WifiConnected01Icon}
                size={32}
                className="animate-float"
              />
            </div>
            <p className="text-lg font-bold mb-2">Connected</p>
            <p className="text-sm text-muted-foreground">
              Waiting for the sender to start the transfer…
            </p>
          </div>
        );

      case "ready":
        return (
          <div>
            <div className="mb-8">
               <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">File to Receive</p>
               {fileInfoBlock}
            </div>
            <Button
              className="w-full py-6 rounded-2xl text-lg font-bold"
              disabled={isAccepting}
              onClick={() => {
                setIsAccepting(true);
                receiverRef.current?.acceptTransfer();
              }}
            >
              {isAccepting ? (
                <>
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    size={20}
                    className="animate-spin-slow mr-2"
                  />
                  Negotiating...
                </>
              ) : (
                <>
                  <DownloadIcon size={20} className="mr-2" />
                  Accept Transfer
                </>
              )}
            </Button>
          </div>
        );

      case "downloading":
      case "paused":
        return (
          <div>
            <div className="mb-8">
               <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Downloading</p>
               {fileInfoBlock}
            </div>
            {progressBlock}
          </div>
        );

      case "done":
        return (
          <div className="text-center">
            <div className="flex items-center justify-center text-primary mb-6">
              <CircleCheckIcon size={48} />
            </div>
            
            <div className="mb-8 text-left">
               <p className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Success</p>
               {fileInfoBlock}
            </div>

            <Button 
               className="w-full py-6 rounded-2xl text-lg font-bold" 
               onClick={triggerDownload}
            >
              <DownloadIcon size={20} className="mr-2" />
              Save File
            </Button>
          </div>
        );

      case "error":
        return null; // Fail silently, maintain UI state where possible, but if forced into error state, render nothing new.
    }
  };

  return (
    <PageLayout
      panel={
        <div className="relative group">
          <AnimatePresence mode="wait">
            <motion.div
              key={peerState}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card/40 backdrop-blur-xl rounded-[2.5rem] p-8 border-2 border-dashed border-border/60 shadow-2xl shadow-primary/10 relative overflow-hidden"
            >
              {/* Subtle background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none" />

              <button
                onClick={onLeave}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer z-10"
              >
                <XIcon size={20} />
              </button>

              {renderPanel()}
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
            Secure Transfer
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-6 text-balance">
            Receiving files <span className="text-primary">with nerdShare</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed text-balance">
            You are about to start a secure transfer directly from the sender. 
            The file will be downloaded directly to your device once you accept.
          </p>
          
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="flex items-center gap-3">
               <div className="flex items-center justify-center text-primary w-10">
                 <WifiIcon size={24} />
               </div>
               <p className="text-sm font-medium">Direct Peer-to-Peer</p>
             </div>
             <div className="flex items-center gap-3">
               <div className="flex items-center justify-center text-primary w-10">
                 <CircleCheckIcon size={24} />
               </div>
               <p className="text-sm font-medium">End-to-End Encrypted</p>
             </div>
          </div>
        </motion.div>
      }
    />
  );
});
