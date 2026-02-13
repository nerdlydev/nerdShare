import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileIcon, DownloadIcon } from "@hugeicons/core-free-icons";

interface LandingViewProps {
  onHost: () => void;
  onJoin: (roomId: string) => void;
  joinRoomId: string;
  setJoinRoomId: (id: string) => void;
}

export function LandingView({
  onHost,
  onJoin,
  joinRoomId,
  setJoinRoomId,
}: LandingViewProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Hero */}
      <div className="text-center mb-12 animate-float">
        <div className="text-5xl mb-4">🚀</div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-chart-1 bg-clip-text text-transparent">
          nerdShare
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Peer-to-peer file sharing. No servers. No limits.
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-xl">
        {/* Share Card */}
        <Card
          className="group hover:ring-primary/30 transition-all duration-300 cursor-pointer"
          onClick={onHost}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={FileIcon} className="text-primary" />
              Share a File
            </CardTitle>
            <CardDescription>
              Select a file and get a room code for your peer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" size="lg">
              Start Sharing
            </Button>
          </CardContent>
        </Card>

        {/* Receive Card */}
        <Card className="group hover:ring-primary/30 transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={DownloadIcon} className="text-chart-1" />
              Receive a File
            </CardTitle>
            <CardDescription>
              Enter the room code from the sender.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                joinRoomId.trim() &&
                onJoin(joinRoomId.trim())
              }
              placeholder="Paste room code..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => joinRoomId.trim() && onJoin(joinRoomId.trim())}
              disabled={!joinRoomId.trim()}
            >
              Join Room
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <p className="text-muted-foreground/50 text-xs mt-16">
        End-to-end encrypted via WebRTC. Your files never touch a server.
      </p>
    </div>
  );
}
