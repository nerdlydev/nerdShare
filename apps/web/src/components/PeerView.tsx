import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { DownloadIcon } from "@hugeicons/core-free-icons";
import type { ConnectionState } from "@/lib/webrtc-manager";
import type { TransferProgress } from "@/lib/transfer-progress";
import { formatBytes, formatTime } from "@/lib/transfer-progress";
import { TransferReceiver } from "@/lib/transfer-receiver";
import type { FileMeta } from "@nerdshare/shared";

interface PeerViewProps {
  roomId: string;
  connectionState: ConnectionState;
  dc: RTCDataChannel | null;
  onLeave: () => void;
  logs: string[];
  addLog: (msg: string) => void;
}

export function PeerView({
  roomId,
  connectionState,
  dc,
  onLeave,
  logs,
  addLog,
}: PeerViewProps) {
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [receivedFile, setReceivedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);

  useEffect(() => {
    if (!dc || dc.readyState !== "open") return;

    const receiver = new TransferReceiver({
      dc,
      onProgress: (p) => setProgress(p),
      onComplete: (_blob: Blob, meta: FileMeta) => {
        setReceivedFile({ name: meta.fileName, size: meta.fileSize });
        addLog(`✅ received: ${meta.fileName}`);
      },
      onError: (err) => addLog(`❌ ${err}`),
    });

    return () => {
      void receiver;
    }; // cleanup ref
  }, [dc, dc?.readyState, addLog]);

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
              <Badge variant={stateBadge[connectionState].variant}>
                {stateBadge[connectionState].label}
              </Badge>
            </div>
            <CardDescription className="mt-1">
              You've joined as a receiver. Waiting for the host to send a file.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Transfer Status */}
        <Card>
          <CardContent className="pt-5">
            {!progress && !receivedFile && (
              <div className="text-center py-12">
                {isConnected ? (
                  <>
                    <div className="text-4xl mb-4 animate-float">📡</div>
                    <p className="text-muted-foreground text-sm">
                      Connected! Waiting for the host to send a file…
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-4xl mb-4">🔗</div>
                    <p className="text-muted-foreground text-sm">
                      Establishing connection with host…
                    </p>
                  </>
                )}
              </div>
            )}

            {progress && !receivedFile && (
              <div className="flex flex-col gap-4 py-4">
                <div className="flex items-center gap-3">
                  <HugeiconsIcon
                    icon={DownloadIcon}
                    className="text-chart-1 shrink-0"
                    size={20}
                  />
                  <div>
                    <p className="text-sm font-medium">Receiving file…</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(progress.totalBytes)} total
                    </p>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.round(progress.progress * 100)}%</span>
                  <span>{formatBytes(progress.speed)}/s</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full animate-shimmer transition-all duration-150"
                    style={{
                      width: `${Math.min(progress.progress * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatTime(progress.timeRemaining)} remaining
                </p>
              </div>
            )}

            {receivedFile && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">✅</div>
                <p className="text-sm font-medium">
                  File received & downloaded!
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {receivedFile.name} — {formatBytes(receivedFile.size)}
                </p>
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
