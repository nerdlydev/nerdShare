import type { ServerWebSocket } from "bun";
import {
  type ClientMessage,
  type ServerMessage,
  type NearbyPeer,
  SignalErrorCode,
  ROOM_DEFAULTS,
} from "@nerdshare/shared";

// ─── Types ───

// Bun's ServerWebSocket is NOT the DOM WebSocket.
// We use a generic type alias to keep the code clean.
type WS = ServerWebSocket<{ ip: string }>;

interface Room {
  roomId: string;
  createdAt: number;
  expiresAt: number;
  hostId: string;
  hostWs: WS;
  hostPublicKey: string;
  peers: Map<string, { ws: WS; publicKey: string }>; // userId → connection
  ttlTimer: Timer;
}

// Reverse lookup: WS → { roomId, userId, lastSeen }
const socketMeta = new WeakMap<
  WS,
  { roomId: string; userId: string; lastSeen: number }
>();

// Track all active WebSocket connections for heartbeat broadcasts
const activeSockets = new Set<WS>();

// ─── State ───

const rooms = new Map<string, Room>();

// ─── Nearby State (filedrop-style IP grouping) ───

interface NearbyClient {
  ws: WS;
  userId: string;
  displayName: string;
  deviceType?: "mobile" | "desktop" | "tablet";
  publicKey: string;
  ip: string;
}

// userId → NearbyClient
const nearbyClients = new Map<string, NearbyClient>();
// ip → Set<userId>
const nearbyGroups = new Map<string, Set<string>>();

// ─── Helpers ───

function sendTo(ws: WS, msg: ServerMessage): void {
  ws.send(JSON.stringify(msg));
}

function sendError(ws: WS, message: string, code?: string): void {
  sendTo(ws, { type: "ERROR", message, code });
}

function broadcastToRoom(
  room: Room,
  msg: ServerMessage,
  excludeUserId?: string,
): void {
  if (room.hostId !== excludeUserId) {
    sendTo(room.hostWs, msg);
  }
  for (const [userId, peerInfo] of room.peers) {
    if (userId !== excludeUserId) {
      sendTo(peerInfo.ws, msg);
    }
  }
}

function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  clearTimeout(room.ttlTimer);
  rooms.delete(roomId);
  console.log(`[room:${roomId}] destroyed (${rooms.size} rooms remaining)`);
}

// ─── Handlers ───

function handleJoinRoom(
  ws: WS,
  msg: Extract<ClientMessage, { type: "JOIN_ROOM" }>,
): void {
  const { roomId, userId, publicKey } = msg;
  const existingRoom = rooms.get(roomId);

  if (existingRoom) {
    // ── Joining an existing room as a peer ──
    if (Date.now() > existingRoom.expiresAt) {
      destroyRoom(roomId);
      sendError(ws, "Room has expired", SignalErrorCode.ROOM_EXPIRED);
      return;
    }

    if (existingRoom.peers.size >= ROOM_DEFAULTS.MAX_PEERS) {
      sendError(ws, "Room is full", SignalErrorCode.ROOM_FULL);
      return;
    }

    existingRoom.peers.set(userId, { ws, publicKey });
    socketMeta.set(ws, { roomId, userId, lastSeen: Date.now() });
    activeSockets.add(ws);

    const existingPeerInfos = [];
    if (existingRoom.hostId !== userId) {
      existingPeerInfos.push({
        userId: existingRoom.hostId,
        publicKey: existingRoom.hostPublicKey,
      });
    }
    for (const [peerId, peerInfo] of existingRoom.peers) {
      if (peerId !== userId) {
        existingPeerInfos.push({
          userId: peerId,
          publicKey: peerInfo.publicKey,
        });
      }
    }

    sendTo(ws, {
      type: "ROOM_JOINED",
      roomId,
      userId,
      peers: existingPeerInfos,
    });
    broadcastToRoom(
      existingRoom,
      { type: "PEER_JOINED", roomId, userId, publicKey },
      userId,
    );

    console.log(
      `[room:${roomId}] peer "${userId}" joined (${existingRoom.peers.size}/${ROOM_DEFAULTS.MAX_PEERS} peers)`,
    );
  } else {
    // ── Creating a new room as the host ──
    const ttlTimer = setTimeout(() => {
      const room = rooms.get(roomId);
      if (room) {
        console.log(`[room:${roomId}] TTL expired`);
        broadcastToRoom(room, {
          type: "ERROR",
          message: "Room expired",
          code: SignalErrorCode.ROOM_EXPIRED,
        });
        destroyRoom(roomId);
      }
    }, ROOM_DEFAULTS.TTL_MS);

    const room: Room = {
      roomId,
      createdAt: Date.now(),
      expiresAt: Date.now() + ROOM_DEFAULTS.TTL_MS,
      hostId: userId,
      hostWs: ws,
      hostPublicKey: publicKey,
      peers: new Map(),
      ttlTimer,
    };

    rooms.set(roomId, room);
    socketMeta.set(ws, { roomId, userId, lastSeen: Date.now() });
    activeSockets.add(ws);

    sendTo(ws, { type: "ROOM_JOINED", roomId, userId, peers: [] });
    console.log(
      `[room:${roomId}] created by host "${userId}" (TTL: ${ROOM_DEFAULTS.TTL_MS / 1000}s)`,
    );
  }
}

function handleRelay(
  ws: WS,
  msg: Extract<ClientMessage, { type: "ENCRYPTED" }>,
): void {
  const room = rooms.get(msg.roomId);
  if (!room) {
    sendError(ws, "Room not found", SignalErrorCode.ROOM_NOT_FOUND);
    return;
  }

  let targetWs: WS | undefined;
  if (msg.toUserId === room.hostId) {
    targetWs = room.hostWs;
  } else {
    targetWs = room.peers.get(msg.toUserId)?.ws;
  }

  if (!targetWs) {
    sendError(ws, "Peer not found in room", SignalErrorCode.PEER_NOT_FOUND);
    return;
  }

  // Forward the message as-is (server is a dumb relay)
  sendTo(targetWs, msg as ServerMessage);
}

function handleNearbyAnnounce(
  ws: WS,
  msg: Extract<ClientMessage, { type: "NEARBY_ANNOUNCE" }>,
): void {
  const ip = ws.data?.ip ?? "unknown";
  const { userId, displayName, deviceType, publicKey } = msg;

  // Register in nearbyClients
  nearbyClients.set(userId, {
    ws,
    userId,
    displayName,
    deviceType,
    publicKey,
    ip,
  });

  // Add to IP group
  if (!nearbyGroups.has(ip)) nearbyGroups.set(ip, new Set());
  nearbyGroups.get(ip)!.add(userId);

  // Broadcast updated peer list to everyone in the group
  broadcastNearbyPeers(ip);
  console.log(`[nearby] "${displayName}" (${userId}) announced from ${ip}`);
}

function handleNearbyConnect(
  ws: WS,
  msg: Extract<ClientMessage, { type: "NEARBY_CONNECT" }>,
): void {
  const { fromUserId, toUserId, roomId } = msg;
  const target = nearbyClients.get(toUserId);
  const from = nearbyClients.get(fromUserId);

  if (!target) {
    sendError(ws, "Nearby peer not found", SignalErrorCode.PEER_NOT_FOUND);
    return;
  }

  // Notify target of incoming nearby connection request
  target.ws.send(
    JSON.stringify({
      type: "NEARBY_INCOMING",
      fromUserId,
      displayName: from?.displayName ?? fromUserId,
      publicKey: from?.publicKey ?? "",
      roomId,
    }),
  );
  console.log(`[nearby] connect: ${fromUserId} → ${toUserId} via ${roomId}`);
}

function broadcastNearbyPeers(ip: string): void {
  const group = nearbyGroups.get(ip);
  if (!group) return;

  const peers: NearbyPeer[] = [];
  for (const uid of group) {
    const client = nearbyClients.get(uid);
    if (client) {
      peers.push({
        userId: client.userId,
        displayName: client.displayName,
        deviceType: client.deviceType,
        publicKey: client.publicKey,
      });
    }
  }

  // Send each client the list of OTHER peers in the group
  for (const uid of group) {
    const client = nearbyClients.get(uid);
    if (client) {
      const peersForClient = peers.filter((p) => p.userId !== uid);
      client.ws.send(
        JSON.stringify({ type: "NEARBY_PEERS", peers: peersForClient }),
      );
    }
  }
}

function removeNearbyClient(userId: string): void {
  const client = nearbyClients.get(userId);
  if (!client) return;

  const group = nearbyGroups.get(client.ip);
  if (group) {
    group.delete(userId);
    if (group.size === 0) {
      nearbyGroups.delete(client.ip);
    } else {
      broadcastNearbyPeers(client.ip);
    }
  }

  nearbyClients.delete(userId);
  console.log(`[nearby] "${client.displayName}" left`);
}

function handleDisconnect(ws: WS): void {
  activeSockets.delete(ws);

  // Clean up nearby presence
  for (const [uid, client] of nearbyClients) {
    if (client.ws === ws) {
      removeNearbyClient(uid);
      break;
    }
  }

  const meta = socketMeta.get(ws);
  if (!meta) return;

  const { roomId, userId } = meta;
  const room = rooms.get(roomId);
  if (!room) return;

  if (userId === room.hostId) {
    console.log(
      `[room:${roomId}] host "${userId}" disconnected — closing room`,
    );
    // Notify all peers before destroying
    for (const [, peerInfo] of room.peers) {
      sendTo(peerInfo.ws, { type: "PEER_LEFT", roomId, userId: room.hostId });
    }
    destroyRoom(roomId);
  } else {
    room.peers.delete(userId);
    broadcastToRoom(room, { type: "PEER_LEFT", roomId, userId }, userId);
    console.log(
      `[room:${roomId}] peer "${userId}" disconnected (${room.peers.size}/${ROOM_DEFAULTS.MAX_PEERS} peers)`,
    );
  }
}

function handleMessage(ws: WS, raw: string | Buffer): void {
  const data = typeof raw === "string" ? raw : raw.toString();

  if (data.length > ROOM_DEFAULTS.MAX_MESSAGE_SIZE) {
    sendError(ws, "Message too large", SignalErrorCode.INVALID_MESSAGE);
    return;
  }

  let msg: ClientMessage;
  try {
    msg = JSON.parse(data);
  } catch {
    sendError(ws, "Invalid JSON", SignalErrorCode.INVALID_MESSAGE);
    return;
  }

  if (!msg || !msg.type) {
    sendError(ws, "Missing message type", SignalErrorCode.INVALID_MESSAGE);
    return;
  }

  // Update activity timestamp for any valid incoming message
  const meta = socketMeta.get(ws);
  if (meta) {
    meta.lastSeen = Date.now();
  }

  switch (msg.type) {
    case "JOIN_ROOM":
      if (!msg.roomId || !msg.userId) {
        sendError(
          ws,
          "Missing roomId or userId",
          SignalErrorCode.INVALID_MESSAGE,
        );
        return;
      }
      handleJoinRoom(ws, msg);
      break;

    case "PONG":
      // Handled by the activity update above
      break;

    case "ENCRYPTED":
      if (!msg.roomId || !msg.fromUserId || !msg.toUserId || !msg.payload) {
        sendError(
          ws,
          "Missing routing fields or payload",
          SignalErrorCode.INVALID_MESSAGE,
        );
        return;
      }
      handleRelay(ws, msg);
      break;

    case "NEARBY_ANNOUNCE":
      if (!msg.userId || !msg.displayName) {
        sendError(
          ws,
          "Missing userId or displayName",
          SignalErrorCode.INVALID_MESSAGE,
        );
        return;
      }
      handleNearbyAnnounce(ws, msg);
      break;

    case "NEARBY_CONNECT":
      if (!msg.fromUserId || !msg.toUserId) {
        sendError(
          ws,
          "Missing fromUserId or toUserId",
          SignalErrorCode.INVALID_MESSAGE,
        );
        return;
      }
      handleNearbyConnect(ws, msg);
      break;

    default:
      sendError(
        ws,
        `Unknown message type: ${(msg as any).type}`,
        SignalErrorCode.INVALID_MESSAGE,
      );
  }
}

// ─── Server ───

const PORT = Number(process.env.PORT) || 8080;

const server = Bun.serve<{ ip: string }>({
  port: PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          rooms: rooms.size,
          nearbyClients: nearbyClients.size,
          uptime: process.uptime(),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    // Read client IP for nearby grouping
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      server.requestIP(req)?.address ??
      "unknown";

    if (server.upgrade(req, { data: { ip } })) {
      return;
    }

    return new Response("nerdShare signaling server", { status: 200 });
  },

  websocket: {
    open(ws) {
      console.log("[ws] client connected");
    },

    message(ws, message: string | Buffer) {
      handleMessage(ws as WS, message);
    },

    close(ws) {
      handleDisconnect(ws as WS);
      console.log("[ws] client disconnected");
    },

    perMessageDeflate: false,
  },
});

console.log(`\n   nerdShare signaling server`);
console.log(`  ├─ port: ${PORT}`);
console.log(`  ├─ health: http://localhost:${PORT}/health`);
console.log(`  └─ ready for WebSocket connections\n`);

// ─── Heartbeat & Cleanup ───

const BROKEN_CHECK_INTERVAL_MS = 2_000; // Check for dead sockets every 2 seconds
const PING_INTERVAL_MS = 10_000; // Ping every 10 seconds
const ZOMBIE_TIMEOUT_MS = 60_000; // Disconnect if silent for 60 seconds

// 1. Remove broken sockets (readyState != OPEN)
setInterval(() => {
  for (const ws of activeSockets) {
    if (ws.readyState !== 1) {
      // 1 = OPEN
      console.log("[cleanup] removing broken socket");
      handleDisconnect(ws);
    }
  }
}, BROKEN_CHECK_INTERVAL_MS);

// 2. Broadcast PING to keep connections warm
setInterval(() => {
  const ping = JSON.stringify({ type: "PING", timestamp: Date.now() });
  for (const ws of activeSockets) {
    try {
      ws.send(ping);
    } catch {
      handleDisconnect(ws);
    }
  }
}, PING_INTERVAL_MS);

// 3. Prune zombie connections (no activity)
setInterval(() => {
  const cutoff = Date.now() - ZOMBIE_TIMEOUT_MS;
  for (const ws of activeSockets) {
    const meta = socketMeta.get(ws);
    if (meta && meta.lastSeen < cutoff) {
      console.log(
        `[cleanup] pruning zombie: ${meta.userId} in room ${meta.roomId}`,
      );
      handleDisconnect(ws);
      try {
        ws.close();
      } catch {}
    }
  }
}, ZOMBIE_TIMEOUT_MS);
