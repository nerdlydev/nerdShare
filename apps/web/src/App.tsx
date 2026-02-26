import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { WebRTCManager, type ConnectionState } from "@/lib/webrtc-manager";
import { LandingView } from "@/components/LandingView";
import { HostView } from "@/components/HostView";
import { PeerView } from "@/components/PeerView";
import { LogsContext } from "@/lib/logs-context";
import { useNearbyPeers } from "@/lib/use-nearby-peers";
import { useClientName } from "@/lib/use-client-name";

const SIGNALING_URL = "ws://localhost:8080";

function generateId(): string {
  return crypto.randomUUID().split("-")[0];
}

/** Extract room ID from pathname like /r/abc123 */
function getRoomFromPath(): string | null {
  const match = window.location.pathname.match(/^\/r\/([a-zA-Z0-9-]+)/);
  return match ? match[1] : null;
}

export function App() {
  const [role, setRole] = useState<"host" | "peer" | null>(null);
  const [roomId, setRoomId] = useState("");
  const [isNearby, setIsNearby] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId] = useState(() => generateId());

  const displayName = useClientName();
  const deviceType = useMemo(() => {
    const ua = navigator.userAgent;
    if (ua.includes("iPhone") || ua.includes("Android")) return "mobile";
    if (ua.includes("iPad")) return "tablet";
    return "desktop";
  }, []);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [dc, setDc] = useState<RTCDataChannel | null>(null);

  const managerRef = useRef<WebRTCManager | null>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${ts}] ${msg}`]);
  }, []);

  const cleanup = useCallback(() => {
    managerRef.current?.stop();
    managerRef.current = null;
    setDc(null);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const leave = useCallback(() => {
    cleanup();
    setRole(null);
    setRoomId("");
    setIsNearby(false);
    setSelectedFile(null);
    setConnectionState("idle");
    setLogs([]);
    window.history.pushState(null, "", "/");
  }, [cleanup]);

  // ── Sender: file selected → create room ──
  const handleFileSelected = useCallback(
    (file: File, providedRoomId?: string, isNearbyTransfer = false) => {
      cleanup();
      const newRoomId = providedRoomId || generateId();
      setRoomId(newRoomId);
      setIsNearby(isNearbyTransfer);
      setSelectedFile(file);
      setRole("host");
      setLogs([]);

      // Update URL to show the room but NOT /r/ (that's for receivers)
      // The host stays on / with state

      const mgr = new WebRTCManager({
        signalingUrl: SIGNALING_URL,
        role: "host",
        roomId: newRoomId,
        userId,
        onStateChange: (s) => {
          setConnectionState(s);
          addLog(`state → ${s}`);
        },
        onDataChannelOpen: (channel) => {
          setDc(channel);
          addLog("  DataChannel open");
        },
        onDataChannelMessage: () => {},
        onDataChannelClose: () => {
          setDc(null);
          addLog("DataChannel closed");
        },
        onError: (err) => addLog(`  ${err}`),
      });

      managerRef.current = mgr;
      mgr.start();
      addLog(`created room: ${newRoomId}`);
    },
    [userId, addLog, cleanup],
  );

  // ── Receiver: join a room ──
  const joinRoom = useCallback(
    (id: string) => {
      cleanup();
      setRoomId(id);
      setRole("peer");
      setLogs([]);

      const mgr = new WebRTCManager({
        signalingUrl: SIGNALING_URL,
        role: "peer",
        roomId: id,
        userId,
        onStateChange: (s) => {
          setConnectionState(s);
          addLog(`state → ${s}`);
        },
        onDataChannelOpen: (channel) => {
          setDc(channel);
          addLog("  DataChannel open");
        },
        onDataChannelMessage: () => {},
        onDataChannelClose: () => {
          setDc(null);
          addLog("DataChannel closed");
        },
        onError: (err) => addLog(`  ${err}`),
      });

      managerRef.current = mgr;
      mgr.start();
      addLog(`joining room: ${id}`);
    },
    [userId, addLog, cleanup],
  );

  // ── Auto-join if URL has /r/:roomId ──
  useEffect(() => {
    const hashRoom = getRoomFromPath();
    if (hashRoom && !role) {
      joinRoom(hashRoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for Incoming Nearby Connections & Announce Presence ──
  const handleIncomingNearby = useCallback(
    (msg: any) => {
      const { fromUserId, displayName, roomId } = msg;

      console.log(
        `[nearby] Incoming connection from ${displayName || "Unknown"} (${fromUserId}) to room ${roomId}`,
      );
      setIsNearby(true);
      joinRoom(roomId);
    },
    [joinRoom],
  );

  const peers = useNearbyPeers({
    userId,
    displayName,
    deviceType,
    enabled: role === null, // Only announce and search when sitting on the Landing Page
    onIncomingRequest: handleIncomingNearby,
  });

  // ── Route ──
  if (!role) {
    return (
      <LandingView
        userId={userId}
        peers={peers}
        onFileSelected={handleFileSelected}
      />
    );
  }

  if (role === "host" && selectedFile) {
    const shareUrl = `${window.location.origin}/r/${roomId}`;
    return (
      <LogsContext.Provider value={logs}>
        <HostView
          file={selectedFile}
          shareUrl={shareUrl}
          isNearby={isNearby}
          connectionState={connectionState}
          dc={dc}
          onLeave={leave}
        />
      </LogsContext.Provider>
    );
  }

  return (
    <LogsContext.Provider value={logs}>
      <PeerView
        connectionState={connectionState}
        dc={dc}
        addLog={addLog}
        onLeave={leave}
      />
    </LogsContext.Provider>
  );
}

export default App;
