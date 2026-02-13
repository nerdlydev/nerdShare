import { useState, useRef, useCallback, useEffect } from "react";
import { WebRTCManager, type ConnectionState } from "@/lib/webrtc-manager";
import { LandingView } from "@/components/LandingView";
import { HostView } from "@/components/HostView";
import { PeerView } from "@/components/PeerView";

const SIGNALING_URL = "ws://localhost:8080";

function generateId(): string {
  return crypto.randomUUID().split("-")[0];
}

export function App() {
  const [role, setRole] = useState<"host" | "peer" | null>(null);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
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
    setConnectionState("idle");
    setLogs([]);
  }, [cleanup]);

  const createRoom = useCallback(() => {
    cleanup();
    const newRoomId = generateId();
    setRoomId(newRoomId);
    setRole("host");
    setLogs([]);

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
  }, [userId, addLog, cleanup]);

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

  // ── Route ──
  if (!role) {
    return (
      <LandingView
        onHost={createRoom}
        onJoin={joinRoom}
        joinRoomId={joinRoomId}
        setJoinRoomId={setJoinRoomId}
      />
    );
  }

  if (role === "host") {
    return (
      <HostView
        roomId={roomId}
        connectionState={connectionState}
        dc={dc}
        onLeave={leave}
        logs={logs}
      />
    );
  }

  return (
    <PeerView
      roomId={roomId}
      connectionState={connectionState}
      dc={dc}
      onLeave={leave}
      logs={logs}
      addLog={addLog}
    />
  );
}

export default App;
