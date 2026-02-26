import { useState, useEffect } from "react";
import { type NearbyPeer, type ServerMessage } from "@nerdshare/shared";

interface UseNearbyPeersOptions {
  userId: string;
  displayName: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  enabled: boolean;
  onIncomingRequest?: (msg: any) => void;
}

export function useNearbyPeers({
  userId,
  displayName,
  deviceType,
  enabled,
  onIncomingRequest,
}: UseNearbyPeersOptions) {
  const [peers, setPeers] = useState<NearbyPeer[]>([]);

  useEffect(() => {
    if (!enabled) {
      setPeers([]);
      return;
    }

    const socket = new WebSocket("ws://localhost:8080");
    let isUnmounted = false;

    socket.onopen = () => {
      if (isUnmounted) {
        socket.close();
        return;
      }
      // Announce presence
      socket.send(
        JSON.stringify({
          type: "NEARBY_ANNOUNCE",
          userId,
          displayName,
          deviceType,
          publicKey: "not-implemented-yet",
        }),
      );
    };

    socket.onmessage = (event) => {
      if (isUnmounted) return;
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === "NEARBY_PEERS") {
          const uniquePeers = new Map<string, NearbyPeer>();

          for (const p of msg.peers) {
            // 1. Filter out our own device entirely (both this tab and any other tabs on this browser)
            if (p.userId === userId || p.displayName === displayName) continue;

            // 2. Deduplicate cross-device tabs (if someone else has 3 tabs open, only show them once)
            if (!uniquePeers.has(p.displayName)) {
              uniquePeers.set(p.displayName, p);
            }
          }

          setPeers(Array.from(uniquePeers.values()));
        } else if (msg.type === "NEARBY_INCOMING") {
          if (onIncomingRequest) {
            onIncomingRequest(msg);
          }
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    return () => {
      isUnmounted = true;
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [userId, displayName, deviceType, enabled]);

  return peers;
}
