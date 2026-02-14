import { useState, useRef, useCallback, useEffect } from "react";
import { WebRTCManager, type ConnectionState } from "@/lib/webrtc-manager";
import { LandingView } from "@/components/LandingView";
import { HostView } from "@/components/HostView";
import { PeerView } from "@/components/PeerView";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId] = useState(() => generateId());
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
    setSelectedFile(null);
    setConnectionState("idle");
    setLogs([]);
    window.history.pushState(null, "", "/");
  }, [cleanup]);

  // ── Sender: file selected → create room ──
  const handleFileSelected = useCallback(
    (file: File) => {
      cleanup();
      const newRoomId = generateId();
      setRoomId(newRoomId);
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
          addLog("✅ DataChannel open");
        },
        onDataChannelMessage: () => {},
        onDataChannelClose: () => {
          setDc(null);
          addLog("DataChannel closed");
        },
        onError: (err) => addLog(`❌ ${err}`),
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
          addLog("✅ DataChannel open");
        },
        onDataChannelMessage: () => {},
        onDataChannelClose: () => {
          setDc(null);
          addLog("DataChannel closed");
        },
        onError: (err) => addLog(`❌ ${err}`),
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

  // ── Route ──
  if (!role) {
    return <LandingView onFileSelected={handleFileSelected} />;
  }

  if (role === "host" && selectedFile) {
    const shareUrl = `${window.location.origin}/r/${roomId}`;
    return (
      <HostView
        file={selectedFile}
        shareUrl={shareUrl}
        connectionState={connectionState}
        dc={dc}
        onLeave={leave}
        logs={logs}
      />
    );
  }

  return (
    <PeerView
      connectionState={connectionState}
      dc={dc}
      logs={logs}
      addLog={addLog}
    />
  );
}

export default App;
