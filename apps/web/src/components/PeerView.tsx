import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/PageLayout";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FileIcon,
  DownloadIcon,
  Loading03Icon,
  WifiConnected01Icon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import type { ConnectionState } from "@/lib/webrtc-manager";
import type { TransferProgress } from "@/lib/transfer-progress";
import { formatBytes, formatTime } from "@/lib/transfer-progress";
import { TransferReceiver } from "@/lib/transfer-receiver";
import type { FileMeta } from "@nerdshare/shared";

type PeerState =
  | "connecting"
  | "waiting"
  | "ready"
  | "downloading"
  | "paused"
  | "done"
  | "error";

interface PeerViewProps {
  connectionState: ConnectionState;
  dc: RTCDataChannel | null;
  logs: string[];
  addLog: (msg: string) => void;
  onLeave: () => void;
}

export function PeerView({
  connectionState,
  dc,
  logs,
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const receiverRef = useRef<TransferReceiver | null>(null);

  const isConnected = connectionState === "connected";

  useEffect(() => {
    if (isConnected) setPeerState("waiting");
    if (connectionState === "disconnected" || connectionState === "failed") {
      setPeerState("error");
      setErrorMsg("Connection lost");
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
          `📄 file offered: ${meta.fileName} (${formatBytes(meta.fileSize)})`,
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
        addLog(`✅ received: ${meta.fileName}`);
      },
      onError: (err) => {
        addLog(`❌ error: ${err}`);
        setErrorMsg(err);
        setPeerState("error");
      },
      onStateChange: (state) => {
        if (state === "paused") setPeerState("paused");
        if (state === "transferring" && peerState === "paused")
          setPeerState("downloading");
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
      <HugeiconsIcon icon={FileIcon} size={16} className="text-primary" />
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

  // Render the left panel based on state
  const renderPanel = () => {
    const closeButton = (
      <button
        onClick={onLeave}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <HugeiconsIcon icon={Cancel01Icon} size={18} />
      </button>
    );

    switch (peerState) {
      case "connecting":
        return (
          <div className="bg-card/50 rounded-2xl p-8 border border-border text-center relative">
            {closeButton}
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <HugeiconsIcon
                icon={Loading03Icon}
                size={48}
                className="text-primary animate-spin-slow"
              />
            </div>
            <p className="text-sm font-medium mb-1">Connecting to sender</p>
            <p className="text-xs text-muted-foreground">
              Trying to establish a connection with the sender
            </p>
          </div>
        );

      case "waiting":
        return (
          <div className="bg-card/50 rounded-2xl p-8 border border-border text-center relative">
            {closeButton}
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <HugeiconsIcon
                icon={WifiConnected01Icon}
                size={28}
                className="text-primary animate-float"
              />
            </div>
            <p className="text-sm font-medium mb-1">Connected</p>
            <p className="text-xs text-muted-foreground">
              Waiting for the sender to start the transfer…
            </p>
          </div>
        );

      case "ready":
        return (
          <div className="bg-card/50 rounded-2xl p-6 border border-border relative">
            {closeButton}
            {fileInfoBlock}
            <Button
              className="w-full"
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
                    size={16}
                    className="animate-spin-slow"
                  />
                  Starting download...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={DownloadIcon} size={16} />
                  Download
                </>
              )}
            </Button>
          </div>
        );

      case "downloading":
        return (
          <div className="bg-card/50 rounded-2xl p-6 border border-border relative">
            {closeButton}
            {fileInfoBlock}
            {progressBlock}
          </div>
        );

      case "paused":
        return (
          <div className="bg-card/50 rounded-2xl p-6 border border-border relative">
            {closeButton}
            {fileInfoBlock}
            {progressBlock}
          </div>
        );

      case "done":
        return (
          <div className="bg-card/50 rounded-2xl p-6 border border-border relative">
            {closeButton}
            {fileInfoBlock}
            <div className="flex items-center justify-center gap-1.5 text-sm text-green-400 font-medium mb-3">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} />
              Download complete!
            </div>
            <Button className="w-full" onClick={triggerDownload}>
              <HugeiconsIcon icon={DownloadIcon} size={16} />
              Download Again
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="bg-card/50 rounded-2xl p-6 border border-border text-center relative">
            {closeButton}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <HugeiconsIcon
                icon={Alert02Icon}
                size={28}
                className="text-destructive"
              />
            </div>
            <p className="text-sm font-medium mb-2">
              {errorMsg ?? "Transfer failed"}
            </p>
            {progress && progress.progress > 0 && progress.progress < 1 && (
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-destructive transition-all duration-150"
                    style={{
                      width: `${Math.min(progress.progress * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Received {Math.round(progress.progress * 100)}% before failure
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground leading-relaxed">
              The sender has either closed this transfer or is now offline.
              Please check if the sender has an active internet connection or
              ask for a new link.
            </p>
          </div>
        );
    }
  };

  return (
    <PageLayout
      panel={
        <div className="relative">
          {renderPanel()}

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
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight mb-4">
            Receiving files with nerdShare
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            You are about to start a secure transfer with nerdShare, directly
            from the sender. The file will be downloaded directly to your
            device.
          </p>
        </div>
      }
    />
  );
}
