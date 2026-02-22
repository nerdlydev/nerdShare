import type { ServerWebSocket } from "bun";
import {
  type ClientMessage,
  type ServerMessage,
  SignalErrorCode,
  ROOM_DEFAULTS,
} from "@nerdshare/shared";

// ─── Types ───

// Bun's ServerWebSocket is NOT the DOM WebSocket.
// We use a generic type alias to keep the code clean.
type WS = ServerWebSocket<undefined>;

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

function handleDisconnect(ws: WS): void {
  activeSockets.delete(ws);
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
    for (const [peerId, peerInfo] of room.peers) {
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
      // Update lastSeen timestamp for this connection
      const meta = socketMeta.get(ws);
      if (meta) meta.lastSeen = Date.now();
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

const server = Bun.serve({
  port: PORT,

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          rooms: rooms.size,
          uptime: process.uptime(),
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    if (server.upgrade(req)) {
      return;
    }

    return new Response("nerdShare signaling server", { status: 200 });
  },

  websocket: {
    open(ws: WS) {
      console.log("[ws] client connected");
    },

    message(ws: WS, message: string | Buffer) {
      handleMessage(ws, message);
    },

    close(ws: WS) {
      handleDisconnect(ws);
      console.log("[ws] client disconnected");
    },

    perMessageDeflate: false,
  },
});

console.log(`\n   nerdShare signaling server`);
console.log(`  ├─ port: ${PORT}`);
console.log(`  ├─ health: http://localhost:${PORT}/health`);
console.log(`  └─ ready for WebSocket connections\n`);

// ─── Heartbeat ───

const PING_INTERVAL_MS = 15_000; // Ping every 15 seconds
const ZOMBIE_TIMEOUT_MS = 30_000; // Disconnect if silent for 30 seconds

// Broadcast PING to all active sockets
setInterval(() => {
  const ping = JSON.stringify({ type: "PING", timestamp: Date.now() });
  for (const ws of activeSockets) {
    try {
      ws.send(ping);
    } catch {
      activeSockets.delete(ws);
    }
  }
}, PING_INTERVAL_MS);

// Prune zombie connections that haven't responded
setInterval(() => {
  const cutoff = Date.now() - ZOMBIE_TIMEOUT_MS;
  for (const ws of activeSockets) {
    const meta = socketMeta.get(ws);
    if (meta && meta.lastSeen < cutoff) {
      console.log(
        `[heartbeat] pruning zombie: ${meta.userId} in room ${meta.roomId}`,
      );
      handleDisconnect(ws);
      try {
        ws.close();
      } catch {}
    }
  }
}, ZOMBIE_TIMEOUT_MS);
