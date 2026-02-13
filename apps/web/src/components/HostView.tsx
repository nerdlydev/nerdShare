import { useRef, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileIcon, Copy01Icon } from "@hugeicons/core-free-icons";
import type { ConnectionState } from "@/lib/webrtc-manager";
import type { TransferProgress } from "@/lib/transfer-progress";
import { formatBytes, formatTime } from "@/lib/transfer-progress";
import { TransferSender } from "@/lib/transfer-sender";

interface HostViewProps {
  roomId: string;
  connectionState: ConnectionState;
  dc: RTCDataChannel | null;
  onLeave: () => void;
  logs: string[];
}

export function HostView({
  roomId,
  connectionState,
  dc,
  onLeave,
  logs,
}: HostViewProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [transferComplete, setTransferComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const senderRef = useRef<TransferSender | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragOver(false), []);

  const startTransfer = useCallback(async () => {
    if (!selectedFile || !dc || isTransferring) return;
    setIsTransferring(true);
    setTransferComplete(false);

    const sender = new TransferSender({
      dc,
      file: selectedFile,
      onProgress: (p) => setProgress(p),
      onComplete: () => {
        setIsTransferring(false);
        setTransferComplete(true);
      },
      onError: () => {
        setIsTransferring(false);
      },
    });
    senderRef.current = sender;
    await sender.start();
  }, [selectedFile, dc, isTransferring]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isConnected = connectionState === "connected";
  const stateBadge: Record<
    ConnectionState,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    idle: { label: "Idle", variant: "secondary" },
    signaling: { label: "Signaling…", variant: "outline" },
    connecting: { label: "Connecting…", variant: "outline" },
    connected: { label: "Connected", variant: "default" },
    disconnected: { label: "Disconnected", variant: "destructive" },
    failed: { label: "Failed", variant: "destructive" },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg flex flex-col gap-5">
        {/* Room Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">Room</CardTitle>
                <code className="text-primary font-mono text-base bg-primary/10 px-2 py-0.5 rounded-md">
                  {roomId}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={stateBadge[connectionState].variant}>
                  {stateBadge[connectionState].label}
                </Badge>
              </div>
            </div>
            <CardDescription className="flex items-center gap-2 mt-1">
              Share this code with your peer so they can connect.
              <button
                onClick={copyRoomId}
                className="inline-flex items-center gap-1 text-primary hover:underline cursor-pointer text-xs"
              >
                <HugeiconsIcon icon={Copy01Icon} size={12} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Drop Zone / File Select */}
        <Card>
          <CardContent className="pt-5">
            {!selectedFile ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200
                  ${
                    isDragOver
                      ? "border-primary bg-primary/10 animate-pulse-glow"
                      : "border-border hover:border-primary/50 hover:bg-muted/30"
                  }
                `}
              >
                <div className="text-3xl mb-3">📂</div>
                <p className="text-sm text-muted-foreground">
                  Drag & drop a file here, or{" "}
                  <span className="text-primary font-medium">browse</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* File Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <HugeiconsIcon
                    icon={FileIcon}
                    className="text-primary shrink-0"
                    size={20}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(selectedFile.size)}
                    </p>
                  </div>
                  {!isTransferring && !transferComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Change
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {progress && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{Math.round(progress.progress * 100)}%</span>
                      <span>{formatBytes(progress.speed)}/s</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${
                          progress.progress >= 1
                            ? "bg-green-500"
                            : "animate-shimmer"
                        }`}
                        style={{
                          width: `${Math.min(progress.progress * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {progress.progress >= 1
                        ? "Complete!"
                        : `${formatTime(progress.timeRemaining)} remaining`}
                    </p>
                  </div>
                )}

                {/* Send Button */}
                {!transferComplete ? (
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={startTransfer}
                    disabled={!isConnected || isTransferring}
                  >
                    {isTransferring
                      ? "Sending…"
                      : isConnected
                        ? "Send File"
                        : "Waiting for peer…"}
                  </Button>
                ) : (
                  <div className="text-center text-sm text-green-400 font-medium py-2">
                    ✅ Transfer complete!
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug Log */}
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer select-none mb-2">
            Debug Log
          </summary>
          <div className="bg-card border border-border rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[10px] text-muted-foreground/70 space-y-0.5">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </details>

        <Button
          variant="ghost"
          size="sm"
          onClick={onLeave}
          className="self-center text-muted-foreground"
        >
          Leave Room
        </Button>
      </div>
    </div>
  );
}
