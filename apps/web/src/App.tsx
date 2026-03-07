import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { WebRTCManager, type ConnectionState } from "@/lib/webrtc-manager";
import { LandingView } from "@/components/LandingView";
import { HostView } from "@/components/HostView";
import { PeerView } from "@/components/PeerView";
import { NearbyView } from "@/components/NearbyView";
import { LogsContext } from "@/lib/logs-context";
import { useNearbyPeers } from "@/lib/use-nearby-peers";
import { useClientName } from "@/lib/use-client-name";
import { AppShell, type NavPage } from "@/components/AppShell";
import { AboutPage } from "@/components/pages/AboutPage";
import { ContactPage } from "@/components/pages/ContactPage";
import { PrivacyPage } from "@/components/pages/PrivacyPage";

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
  const [navPage, setNavPage] = useState<NavPage>("home");

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
    setNavPage("home");
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
    enabled: role === null,
    onIncomingRequest: handleIncomingNearby,
  });

  // ── Render page content ──
  const renderContent = () => {
    // During an active transfer, show the transfer view
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

    if (role === "peer") {
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

    // Nav-page routing (only when idle)
    if (navPage === "nearby") {
      return (
        <NearbyView
          userId={userId}
          peers={peers}
          onBack={() => setNavPage("home")}
          onConnect={(_, roomId, file) => {
            handleFileSelected(file, roomId, true);
          }}
        />
      );
    }
    if (navPage === "about") return <AboutPage />;
    if (navPage === "contact") return <ContactPage />;
    if (navPage === "privacy") return <PrivacyPage />;

    return (
      <LandingView
        peers={peers}
        onFileSelected={handleFileSelected}
        onNavigate={setNavPage}
      />
    );
  };

  // Derive the active nav page for the shell
  const activeNavPage: NavPage = role !== null ? navPage : navPage;

  return (
    <AppShell activePage={activeNavPage} onNavigate={setNavPage}>
      {renderContent()}
    </AppShell>
  );
}

export default App;
