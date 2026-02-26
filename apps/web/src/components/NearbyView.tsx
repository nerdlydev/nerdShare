import { useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  SmartPhone01Icon,
  LaptopProgrammingIcon,
  Wifi01Icon,
  ArrowLeft01Icon,
} from "@hugeicons/core-free-icons";
import { type NearbyPeer } from "@nerdshare/shared";

interface NearbyViewProps {
  userId: string;
  peers: NearbyPeer[];
  onBack: () => void;
  onConnect: (peerId: string, roomId: string, file: File) => void;
}

export function NearbyView({
  userId,
  peers,
  onBack,
  onConnect,
}: NearbyViewProps) {
  const getIcon = (type?: string) => {
    if (type === "mobile" || type === "tablet") {
      return SmartPhone01Icon;
    }
    return LaptopProgrammingIcon;
  };

  const handleConnect = useCallback(
    (targetUserId: string, file: File) => {
      // 1. Generate a roomId for the actual WebRTC transfer
      const roomId = crypto.randomUUID().split("-")[0];

      // 2. We need a short-lived WS connection just to push the NEARBY_CONNECT message.
      const socket = new WebSocket("ws://localhost:8080");

      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            type: "NEARBY_CONNECT",
            fromUserId: userId,
            toUserId: targetUserId,
            roomId,
          }),
        );
        setTimeout(() => socket.close(), 500); // Allow buffer to flush before closing
      };

      // 3. Immediately transition the local app into "host" mode for this new roomId
      onConnect(targetUserId, roomId, file);
    },
    [userId, onConnect],
  );

  return (
    <div className="flex flex-col h-full bg-background mt-4 sm:mt-8 px-4 sm:px-6 md:px-8 max-w-4xl mx-auto w-full pb-8">
      {/* Header */}
      <div className="flex items-center mb-8 gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-muted/50 text-muted-foreground transition-colors group"
        >
          <HugeiconsIcon
            icon={ArrowLeft01Icon}
            size={24}
            className="group-hover:-translate-x-0.5 transition-transform"
          />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nearby Devices</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <HugeiconsIcon
              icon={Wifi01Icon}
              size={14}
              className="text-yellow-500"
            />
            Both devices must be on the same Wi-Fi network
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-3 max-w-lg w-full">
        {peers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-border bg-card/30">
            <div className="w-10 h-10 mb-4 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-base font-medium mb-1">
              Looking for devices...
            </h3>
            <p className="text-sm text-muted-foreground">
              Make sure nerdShare is open on the other device and connected to
              the same Wi-Fi.
            </p>
          </div>
        ) : (
          peers.map((peer: NearbyPeer) => (
            <div
              key={peer.userId}
              className="flex items-center justify-between p-4 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <HugeiconsIcon icon={getIcon(peer.deviceType)} size={20} />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">
                    {peer.displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {peer.userId}
                  </p>
                </div>
              </div>

              <button
                key={peer.userId}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      handleConnect(peer.userId, file);
                    }
                  };
                  input.click();
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                Send file
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
