import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom";
import { WebRTCManager, type ConnectionState } from "@/lib/webrtc-manager";
import { LandingView } from "@/components/LandingView";
import { HostView } from "@/components/HostView";
import { PeerView } from "@/components/PeerView";
import { NearbyDevicesPage } from "@/components/pages/NearbyDevicesPage";
import { LogsContext } from "@/lib/logs-context";
import { useNearbyPeers } from "@/lib/use-nearby-peers";
import { useClientName } from "@/lib/use-client-name";
import { AppShell } from "@/components/AppShell";
import { AboutPage } from "@/components/pages/AboutPage";
import { ContactPage } from "@/components/pages/ContactPage";
import { PrivacyPage } from "@/components/pages/PrivacyPage";
import ScrollToTop from "@/components/ScrollToTop";

const SIGNALING_URL = 
  window.location.hostname === "localhost"
    ? "ws://localhost:8080"
    : `ws://${window.location.hostname}:8080`;

function generateId(): string {
  return crypto.randomUUID().split("-")[0];
}


export function App() {
  const [role, setRole] = useState<"host" | "peer" | null>(null);
  const [roomId, setRoomId] = useState("");
  const [isNearby, setIsNearby] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userId] = useState(() => generateId());
  
  const navigate = useNavigate();

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
    navigate("/");
  }, [cleanup, navigate]);

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

      const mgr = new WebRTCManager({
        signalingUrl: SIGNALING_URL,
        role: "host",
        roomId: newRoomId,
        userId,
        onStateChange: setConnectionState,
        onLog: addLog,
        onDataChannelOpen: (channel) => {
          setDc(channel);
          addLog("DataChannel open");
        },
        onDataChannelMessage: () => {},
        onDataChannelClose: () => {
          setDc(null);
          addLog("DataChannel closed");
        },
        onError: (err) => addLog(`error: ${err}`),
      });

      managerRef.current = mgr;
      mgr.start();
      addLog(`created room: ${newRoomId}`);
      navigate(`/r/${newRoomId}`);
    },
    [userId, addLog, cleanup, navigate],
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
        onStateChange: setConnectionState,
        onLog: addLog,
        onDataChannelOpen: (channel) => {
          setDc(channel);
          addLog("DataChannel open");
        },
        onDataChannelMessage: () => {},
        onDataChannelClose: () => {
          setDc(null);
          addLog("DataChannel closed");
        },
        onError: (err) => addLog(`error: ${err}`),
      });

      managerRef.current = mgr;
      mgr.start();
      addLog(`joining room: ${id}`);
    },
    [userId, addLog, cleanup],
  );

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
    enabled: role === null,
    onIncomingRequest: handleIncomingNearby,
  });

  const location = useLocation();

  // Extract roomId from URL path since App.tsx is outside the Routes context for useParams
  const urlRoomId = useMemo(() => {
    const match = location.pathname.match(/^\/r\/([^/]+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  // Auto-join if on /r/:roomId and no role set
  useEffect(() => {
    if (urlRoomId && !role) {
      console.log(`[app] auto-joining room from URL: ${urlRoomId}`);
      joinRoom(urlRoomId);
    }
  }, [urlRoomId, role, joinRoom]);

  return (
    <AppShell>
      <ScrollToTop />
      <Routes>
        <Route 
          path="/" 
          element={
            <LandingView
              peers={peers}
              onFileSelected={handleFileSelected}
              onNavigate={(page) => navigate(`/${page}`)}
            />
          } 
        />
        <Route 
          path="/nearby" 
          element={
            <NearbyDevicesPage
              userId={userId}
              peers={peers}
              onConnect={(_, roomId, file) => {
                handleFileSelected(file, roomId, true);
              }}
            />
          } 
        />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        
        {/* Active Transfer Route */}
        <Route 
          path="/r/:roomId" 
          element={
            role === "host" && selectedFile ? (
              <LogsContext.Provider value={logs}>
                <HostView
                  file={selectedFile}
                  shareUrl={`${window.location.origin}/r/${roomId}`}
                  isNearby={isNearby}
                  connectionState={connectionState}
                  dc={dc}
                  onLeave={leave}
                />
              </LogsContext.Provider>
            ) : role === "peer" ? (
              <LogsContext.Provider value={logs}>
                <PeerView
                  connectionState={connectionState}
                  dc={dc}
                  addLog={addLog}
                  onLeave={leave}
                />
              </LogsContext.Provider>
            ) : (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-muted-foreground">Connecting to room...</div>
              </div>
            )
          } 
        />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
