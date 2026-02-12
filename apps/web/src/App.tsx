import { useState, useRef, useCallback, useEffect } from "react";
import { WebRTCManager, type ConnectionState } from "@/lib/webrtc-manager";

const SIGNALING_URL = "ws://localhost:8080";

function generateId(): string {
  return crypto.randomUUID().split("-")[0]; // short readable ID
}

export function App() {
  const [role, setRole] = useState<"host" | "peer" | null>(null);
  const [roomId, setRoomId] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [userId] = useState(() => generateId());
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [messages, setMessages] = useState<{ from: string; text: string }[]>(
    [],
  );
  const [inputMsg, setInputMsg] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const managerRef = useRef<WebRTCManager | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const addLog = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  }, []);

  const cleanup = useCallback(() => {
    managerRef.current?.stop();
    managerRef.current = null;
    dcRef.current = null;
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  const createRoom = useCallback(() => {
    cleanup();
    const newRoomId = generateId();
    setRoomId(newRoomId);
    setRole("host");
    setMessages([]);
    setLogs([]);

    const manager = new WebRTCManager({
      signalingUrl: SIGNALING_URL,
      role: "host",
      roomId: newRoomId,
      userId,
      onStateChange: (state) => {
        setConnectionState(state);
        addLog(`state → ${state}`);
      },
      onDataChannelOpen: (dc) => {
        dcRef.current = dc;
        addLog("✅ DataChannel open — ready to send messages!");
      },
      onDataChannelMessage: (event) => {
        if (typeof event.data === "string") {
          const parsed = JSON.parse(event.data);
          setMessages((prev) => [...prev, { from: "peer", text: parsed.text }]);
        }
      },
      onDataChannelClose: () => {
        dcRef.current = null;
        addLog("DataChannel closed");
      },
      onError: (err) => addLog(`❌ ${err}`),
    });

    managerRef.current = manager;
    manager.start();
    addLog(`created room: ${newRoomId}`);
  }, [userId, addLog, cleanup]);

  const joinRoom = useCallback(() => {
    if (!joinRoomId.trim()) return;
    cleanup();
    setRoomId(joinRoomId.trim());
    setRole("peer");
    setMessages([]);
    setLogs([]);

    const manager = new WebRTCManager({
      signalingUrl: SIGNALING_URL,
      role: "peer",
      roomId: joinRoomId.trim(),
      userId,
      onStateChange: (state) => {
        setConnectionState(state);
        addLog(`state → ${state}`);
      },
      onDataChannelOpen: (dc) => {
        dcRef.current = dc;
        addLog("✅ DataChannel open — ready to send messages!");
      },
      onDataChannelMessage: (event) => {
        if (typeof event.data === "string") {
          const parsed = JSON.parse(event.data);
          setMessages((prev) => [...prev, { from: "host", text: parsed.text }]);
        }
      },
      onDataChannelClose: () => {
        dcRef.current = null;
        addLog("DataChannel closed");
      },
      onError: (err) => addLog(`❌ ${err}`),
    });

    managerRef.current = manager;
    manager.start();
    addLog(`joining room: ${joinRoomId.trim()}`);
  }, [joinRoomId, userId, addLog, cleanup]);

  const sendMessage = useCallback(() => {
    if (!inputMsg.trim() || !dcRef.current) return;
    const text = inputMsg.trim();
    dcRef.current.send(JSON.stringify({ text }));
    setMessages((prev) => [...prev, { from: "me", text }]);
    setInputMsg("");
  }, [inputMsg]);

  // ── State badge color ──
  const stateColor: Record<ConnectionState, string> = {
    idle: "#6b7280",
    signaling: "#f59e0b",
    connecting: "#f59e0b",
    connected: "#22c55e",
    disconnected: "#ef4444",
    failed: "#ef4444",
  };

  return (
    <div
      style={{
        fontFamily: "monospace",
        maxWidth: 700,
        margin: "40px auto",
        padding: "0 20px",
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>
        🧪 nerdShare — WebRTC Pipe Test
      </h1>
      <p style={{ color: "#888", marginBottom: 24 }}>
        User: <strong>{userId}</strong> | Role: <strong>{role ?? "—"}</strong> |
        State:{" "}
        <span
          style={{ color: stateColor[connectionState], fontWeight: "bold" }}
        >
          {connectionState}
        </span>
      </p>

      {/* ── Room Controls ── */}
      {!role && (
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <button
            onClick={createRoom}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 14,
            }}
          >
            Create Room (Host)
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Room ID"
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              style={{
                padding: "10px 12px",
                border: "1px solid #333",
                borderRadius: 6,
                background: "#1a1a1a",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: 14,
                width: 160,
              }}
            />
            <button
              onClick={joinRoom}
              style={{
                padding: "10px 20px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "monospace",
                fontSize: 14,
              }}
            >
              Join Room (Peer)
            </button>
          </div>
        </div>
      )}

      {/* ── Room Info ── */}
      {role && roomId && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>
              Room: <strong style={{ color: "#93c5fd" }}>{roomId}</strong>
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  addLog("room ID copied!");
                }}
                style={{
                  padding: "4px 12px",
                  background: "#374151",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                Copy
              </button>
              <button
                onClick={() => {
                  cleanup();
                  setRole(null);
                  setRoomId("");
                  setConnectionState("idle");
                  setMessages([]);
                  setLogs([]);
                }}
                style={{
                  padding: "4px 12px",
                  background: "#7f1d1d",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "monospace",
                  fontSize: 12,
                }}
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      {role && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Messages</h3>
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #333",
              borderRadius: 8,
              padding: 12,
              height: 200,
              overflowY: "auto",
              marginBottom: 8,
            }}
          >
            {messages.length === 0 && (
              <span style={{ color: "#555" }}>No messages yet…</span>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 4,
                  color: m.from === "me" ? "#93c5fd" : "#86efac",
                }}
              >
                <strong>{m.from === "me" ? "You" : m.from}:</strong> {m.text}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                connectionState === "connected"
                  ? "Type a message…"
                  : "Waiting for connection…"
              }
              disabled={connectionState !== "connected"}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid #333",
                borderRadius: 6,
                background: "#1a1a1a",
                color: "#fff",
                fontFamily: "monospace",
                fontSize: 14,
                opacity: connectionState !== "connected" ? 0.5 : 1,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={connectionState !== "connected" || !inputMsg.trim()}
              style={{
                padding: "10px 16px",
                background:
                  connectionState === "connected" ? "#2563eb" : "#374151",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor:
                  connectionState === "connected" ? "pointer" : "not-allowed",
                fontFamily: "monospace",
                fontSize: 14,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* ── Debug Log ── */}
      {role && (
        <div>
          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Debug Log</h3>
          <div
            style={{
              background: "#0a0a0a",
              border: "1px solid #222",
              borderRadius: 8,
              padding: 12,
              height: 160,
              overflowY: "auto",
              fontSize: 11,
              color: "#888",
            }}
          >
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
