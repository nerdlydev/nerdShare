# nerdShare — Data Flows

> Step-by-step sequences for every critical path in the system.

---

## 1. File Selection → Link Generation → Transfer (End-to-End)

### Overview

```
Host                     Signaling Server              Peer
 │                            │                          │
 │ 1. Select file             │                          │
 │ 2. Compute metadata        │                          │
 │ 3. WS connect ────────────►│                          │
 │ 4. JOIN_ROOM ─────────────►│                          │
 │ 5. ◄──────── ROOM_JOINED   │                          │
 │ 6. Generate share link     │                          │
 │                            │                          │
 │      ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ Link shared out-of-band ─ ─│
 │                            │                          │
 │                            │◄───────────── WS connect │
 │                            │◄──────────── JOIN_ROOM   │
 │ 7. ◄──────── PEER_JOINED   │                          │
 │                            │                          │
 │ 8. Create RTCPeerConnection│                          │
 │ 9. Create DataChannel      │                          │
 │10. Create Offer            │                          │
 │11. setLocalDescription     │                          │
 │12. OFFER ─────────────────►│───────────────► OFFER    │
 │                            │                          │
 │                            │          setRemoteDesc   │
 │                            │          Create Answer    │
 │                            │          setLocalDesc     │
 │                            │◄──────────── ANSWER      │
 │13. ◄──────── ANSWER        │                          │
 │    setRemoteDescription    │                          │
 │                            │                          │
 │14. ICE_CANDIDATE ─────────►│──────► ICE_CANDIDATE     │
 │    ◄──────────────────────────────── ICE_CANDIDATE     │
 │         (trickle ICE, both directions)                │
 │                            │                          │
 │15. DataChannel opens ◄────────────────────────────────│
 │16. Send FILE_META ─────────────────────────────────►  │
 │17. ◄──────────────────────────────────── HELLO_ACK    │
 │18. Send chunks ────────────────────────────────────►  │
 │    ...chunk by chunk with backpressure...              │
 │19. Send TRANSFER_COMPLETE ─────────────────────────►  │
 │                            │                          │
 │20. Peer reassembles + downloads                       │
```

---

## 2. Step-by-Step Details

### Step 1–2: Host Selects File

Host selects via `<input type="file" />` or drag-and-drop.

Client computes metadata immediately (no upload):

```typescript
interface FileMeta {
  fileId: string; // crypto.randomUUID()
  fileName: string; // file.name
  fileSize: number; // file.size (bytes)
  mimeType: string; // file.type
  lastModified: number; // file.lastModified
  chunkSize: number; // default 256 * 1024 (256 KB)
  totalChunks: number; // Math.ceil(fileSize / chunkSize)
}
```

**Not computed in MVP**: File hash (SHA-256). Hashing a 2 GB file blocks the main thread or requires a Web Worker pipeline. Deferred to Phase 4+.

### Step 3–5: Room Creation

Host connects to the signaling server via WebSocket and sends:

```json
{ "type": "JOIN_ROOM", "roomId": "<generated-uuid>", "userId": "<host-uuid>" }
```

Server responds:

```json
{ "type": "ROOM_JOINED", "roomId": "abc123", "userId": "host-1", "peers": [] }
```

The server creates an ephemeral room in memory:

```typescript
rooms.set(roomId, {
  roomId,
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 60 * 1000, // 30 min TTL
  hostId: userId,
  peers: new Map(), // peerId → WebSocket
});
```

### Step 6: Link Generation

URL format:

```
https://nerdshare.com/#/r/<roomId>
```

Fragment-based routing (`#/r/...`):

- Keeps room ID client-side only
- Server never sees the room token in HTTP logs
- Compatible with static hosting (no server-side routing needed)

**Future enhancement**: Add capability secret `?k=<secret>` for additional access control.

### Step 7: Peer Joins

Peer opens the link, extracts `roomId` from the URL fragment, connects to signaling server:

```json
{ "type": "JOIN_ROOM", "roomId": "abc123", "userId": "peer-1" }
```

Server validates:

- Room exists
- TTL not expired
- Max peers not exceeded

Server notifies host:

```json
{ "type": "PEER_JOINED", "roomId": "abc123", "userId": "peer-1" }
```

### Steps 8–14: WebRTC Signaling Handshake

The Host is always the **initiator** (creates the offer).

```typescript
// HOST SIDE
const pc = new RTCPeerConnection(iceConfig);
const dc = pc.createDataChannel("file", { ordered: true });

pc.onicecandidate = (e) => {
  if (e.candidate) {
    signalingClient.send({
      type: "ICE_CANDIDATE",
      roomId,
      fromUserId: hostId,
      toUserId: peerId,
      candidate: e.candidate.toJSON(),
    });
  }
};

const offer = await pc.createOffer();
await pc.setLocalDescription(offer);
signalingClient.send({
  type: "OFFER",
  roomId,
  fromUserId: hostId,
  toUserId: peerId,
  sdp: pc.localDescription,
});
```

```typescript
// PEER SIDE
pc.ondatachannel = (event) => {
  const dc = event.channel;
  dc.onmessage = handleChunk;
};

await pc.setRemoteDescription(offer.sdp);
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);
signalingClient.send({
  type: "ANSWER",
  roomId,
  fromUserId: peerId,
  toUserId: hostId,
  sdp: pc.localDescription,
});
```

ICE candidates trickle in both directions throughout.

### Steps 15–17: DataChannel Opens

When `dc.onopen` fires on the Host side:

```typescript
// Host sends file metadata as JSON control message
dc.send(
  JSON.stringify({
    type: "FILE_META",
    fileId,
    fileName,
    fileSize,
    mimeType,
    chunkSize,
    totalChunks,
  }),
);
```

Peer acknowledges:

```typescript
dc.send(JSON.stringify({ type: "HELLO_ACK", fileId }));
```

### Steps 18–19: File Transfer

Host reads chunks from the `File` object using `Blob.slice()` and sends as `ArrayBuffer`:

```typescript
for (let i = 0; i < totalChunks; i++) {
  // Backpressure check
  while (dc.bufferedAmount > HIGH_WATERMARK) {
    await waitForBufferedAmountLow(dc);
  }

  const start = i * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const blob = file.slice(start, end);
  const buffer = await blob.arrayBuffer();
  dc.send(buffer);
}

dc.send(JSON.stringify({ type: "TRANSFER_COMPLETE", fileId }));
```

### Step 20: Peer Reassembly

Peer collects chunks into an array and creates a download:

```typescript
const chunks: ArrayBuffer[] = [];
let receivedChunks = 0;

dc.onmessage = (event) => {
  if (typeof event.data === "string") {
    const msg = JSON.parse(event.data);
    if (msg.type === "FILE_META") {
      /* store metadata */
    }
    if (msg.type === "TRANSFER_COMPLETE") {
      assembleAndDownload();
    }
  } else {
    // Binary chunk
    chunks.push(event.data);
    receivedChunks++;
    updateProgress(receivedChunks / totalChunks);
  }
};

function assembleAndDownload() {
  const blob = new Blob(chunks, { type: mimeType });
  const url = URL.createObjectURL(blob);
  // Trigger download via <a> tag
}
```

---

## 3. Signaling Server Message Routing

### Routing Rules

| Message Type    | Server Action                                                                           |
| --------------- | --------------------------------------------------------------------------------------- |
| `JOIN_ROOM`     | Register peer in room, broadcast `PEER_JOINED` to others, reply `ROOM_JOINED` to sender |
| `OFFER`         | Forward to `toUserId`                                                                   |
| `ANSWER`        | Forward to `toUserId`                                                                   |
| `ICE_CANDIDATE` | Forward to `toUserId`                                                                   |
| `PEER_LEFT`     | Server generates on WS close, broadcasts to room                                        |

### Server-Side Routing Logic

```typescript
function handleMessage(ws: WebSocket, msg: ClientMessage) {
  switch (msg.type) {
    case "JOIN_ROOM":
      joinRoom(ws, msg.roomId, msg.userId);
      break;

    case "OFFER":
    case "ANSWER":
    case "ICE_CANDIDATE":
      // Targeted relay — only forward to the intended recipient
      const targetWs = getSocketForUser(msg.roomId, msg.toUserId);
      if (targetWs) targetWs.send(JSON.stringify(msg));
      break;
  }
}
```

---

## 4. Disconnect Flows

### Host Disconnects

```
Host closes browser
  → WS close event fires on server
    → Server removes room
      → Server sends PEER_LEFT to all peers
        → Peers show "Host disconnected" error
          → Transfer is unrecoverable (file source gone)
```

### Peer Disconnects

```
Peer closes browser
  → WS close event fires on server
    → Server removes peer from room
      → Server sends PEER_LEFT to host
        → Host cleans up that peer's RTCPeerConnection
          → Other peers unaffected (star topology)
```

### Same-Session Reconnect (MVP)

If a peer's WebSocket drops temporarily:

1. Peer reconnects to signaling server
2. Sends `JOIN_ROOM` with same `userId`
3. Server re-registers the peer
4. Host receives new `PEER_JOINED`
5. New WebRTC negotiation begins

**Limitation**: Transfer progress is lost. Full re-transfer required in MVP.

---

## 5. Multi-Peer Transfer Flow (Phase 3)

When multiple peers are connected:

```
Host                    Peer 1              Peer 2
  │                       │                    │
  ├─── DC open ──────────►│                    │
  ├─── DC open ───────────────────────────────►│
  │                       │                    │
  ├─── FILE_META ────────►│                    │
  ├─── FILE_META ─────────────────────────────►│
  │                       │                    │
  ├─── chunk[0] ─────────►│                    │
  ├─── chunk[0] ──────────────────────────────►│
  ├─── chunk[1] ─────────►│                    │
  │  (backpressure wait)  │                    │
  ├─── chunk[1] ──────────────────────────────►│
  │    ...                │                    │
```

Each peer has **independent** backpressure. If Peer 1 is slow, Peer 2 is not affected.

The host maintains a `Map<peerId, PeerSession>` with per-peer state:

```typescript
interface PeerSession {
  peerId: string;
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  status: "connecting" | "connected" | "transferring" | "done" | "failed";
  currentChunk: number;
  bufferedBytes: number;
  lastActivityAt: number;
}
```
