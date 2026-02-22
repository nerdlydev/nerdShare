# nerdShare — System Architecture

> Privacy-first browser-based P2P file sharing via WebRTC DataChannels.

## Key Clarification

nerdShare is **not serverless**. The correct framing:

- **No server-side file storage or file proxying.** File bytes _never_ touch backend infrastructure.
- A **signaling server** (WebSocket) is required for WebRTC negotiation.
- **STUN/TURN infrastructure** is required for NAT traversal and connectivity fallback.

---

## Three-Plane Architecture

The system is decomposed into three independent planes:

```
┌─────────────────────────────────────────────────────────────────┐
│                        nerdShare System                         │
├─────────────────┬─────────────────────┬─────────────────────────┤
│   DATA PLANE    │  SIGNALING PLANE    │    DISCOVERY PLANE      │
│                 │                     │                         │
│  WebRTC         │  WebSocket Server   │  STUN / TURN            │
│  DataChannels   │  (Bun + TS)         │  (Public / coturn)      │
│                 │                     │                         │
│  Carries: file  │  Carries: SDP,      │  Carries: ICE           │
│  bytes only     │  ICE, room events   │  candidates, relay      │
├─────────────────┴─────────────────────┴─────────────────────────┤
│                    CLIENT (React + Vite + TS)                   │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────┐               │
│  │  UI /    │  │  WebRTC     │  │  Signaling   │               │
│  │  Zustand │←→│  Manager    │←→│  Client      │               │
│  └──────────┘  └─────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Data Plane — WebRTC DataChannels

Direct peer-to-peer file transfer. No server intermediary.

### Protocol Stack (Bottom → Top)

| Layer        | Protocol                         | Role                                   |
| ------------ | -------------------------------- | -------------------------------------- |
| Transport    | UDP (preferred) / TCP (fallback) | Raw transport                          |
| Connectivity | ICE                              | NAT traversal, path selection          |
| Encryption   | DTLS                             | Mandatory encryption + integrity       |
| Delivery     | SCTP                             | Message framing, ordering, reliability |
| API          | RTCDataChannel                   | Application-level read/write           |

### Why SCTP over DTLS?

| Need               | SCTP Provides                              |
| ------------------ | ------------------------------------------ |
| Message boundaries | Chunk in → chunk out (no stream splitting) |
| Ordered delivery   | Sequential chunk transfer                  |
| Reliable delivery  | Configurable per-channel                   |
| Flow control       | Built-in congestion control                |

DTLS provides:

- Encryption in transit (mandatory, not optional)
- Integrity protection
- Key exchange
- Runs over UDP (unlike TLS which requires TCP)

### DataChannel Configuration (MVP)

```typescript
const dc = pc.createDataChannel("file", {
  ordered: true, // chunks arrive in order
  // reliable by default (no maxRetransmits / maxPacketLifeTime)
});
```

---

## 2. Signaling Plane — WebSocket Server

### Technology

- **Runtime**: Bun (native TS, fast WS handling)
- **Protocol**: JSON over WebSocket
- **Location**: `apps/signaling/`

### Responsibilities (Strict Boundary)

| Does                            | Does NOT                                   |
| ------------------------------- | ------------------------------------------ |
| Create/manage ephemeral rooms   | Store files                                |
| Relay SDP offer/answer          | Proxy file data                            |
| Relay ICE candidates            | Process file bytes                         |
| Notify peer join/leave events   | Log file content                           |
| Enforce limits (max peers, TTL) | Perform business logic beyond coordination |

### Why Plain WebSocket Over Socket.io?

- **Transparency**: SDP/ICE messages are visible, debuggable
- **Less abstraction**: No reconnect/namespace overhead to fight against
- **Simpler**: Fewer moving parts for a signaling-only server
- Socket.io can be introduced later if reconnection features are needed

---

## 3. Discovery Plane — STUN / TURN

### STUN (Session Traversal Utilities for NAT)

- Discovers the client's public IP + port mapping
- Enables direct P2P connectivity
- **Free**: Google provides public STUN servers (`stun:stun.l.google.com:19302`)
- Used in **all** connections (even when direct P2P succeeds)

### TURN (Traversal Using Relays around NAT)

- **Relay fallback** when direct connectivity fails
- Required when:
  - Symmetric NAT blocks direct paths
  - UDP is blocked by corporate firewalls
  - Mobile carrier-grade NAT prevents hole punching

> ⚠️ TURN is **not** "nice to have". It is the reliability backbone for ~10–15% of real-world connections.

### ICE Configuration

```typescript
const config: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // TURN added in Phase 5+
    // {
    //   urls: "turn:turn.nerdshare.com:443?transport=tcp",
    //   username: "...",
    //   credential: "..."
    // }
  ],
  iceCandidatePoolSize: 10,
};
```

---

## 4. Multi-Peer Topology

### Chosen: Star (Host-Centric)

```
        ┌──────────┐
        │   HOST   │
        │  (file   │
        │  source) │
        └──┬─┬─┬───┘
           │ │ │
     ┌─────┘ │ └─────┐
     ▼       ▼       ▼
  ┌──────┐┌──────┐┌──────┐
  │Peer 1││Peer 2││Peer 3│
  └──────┘└──────┘└──────┘
```

Each peer gets an **independent** `RTCPeerConnection` + `RTCDataChannel`. No peer-to-peer relay.

### Trade-offs

| Property              | Star Topology                                  |
| --------------------- | ---------------------------------------------- |
| Complexity            | Lowest                                         |
| Debug-ability         | Highest                                        |
| Per-peer flow control | Yes (independent channels)                     |
| Failure isolation     | Yes (one peer ≠ all fail)                      |
| Host upload bandwidth | Bottleneck: `speed_per_peer ≈ host_upload / N` |
| Max practical peers   | 3–5 (best UX), 5–10 (acceptable)               |

### Why Not Mesh / Swarm?

- **Mesh**: Every node sends to every node — `O(N²)` connections, combinatorial complexity
- **Swarm**: Peers relay chunks — requires trust model, chunk scheduling, incentive mechanisms
- Both are Phase 6+ candidates, not MVP

---

## 5. Monorepo Structure

```
nerdshare/
├─ apps/
│  ├─ web/              # React + Vite + TypeScript frontend
│  │  └─ src/
│  │     ├─ components/  # UI components (shadcn + custom)
│  │     ├─ lib/         # WebRTC manager, signaling client
│  │     ├─ stores/      # Zustand stores
│  │     └─ pages/       # Route-level components
│  └─ signaling/         # Bun WebSocket signaling server
│     └─ src/
│        └─ server.ts
│
├─ packages/
│  └─ shared/            # Shared TypeScript contracts
│     └─ src/
│        ├─ signaling.ts # Message type definitions
│        └─ index.ts     # Re-exports
│
├─ infra/                # Future: TURN configs, Docker
├─ docs/                 # This documentation
├─ package.json          # Workspace root
└─ bun.lock
```

### Workspace Dependencies

```
apps/web ──depends-on──→ @nerdshare/shared
apps/signaling ──depends-on──→ @nerdshare/shared
```

Both import signaling message types from the shared package, preventing protocol drift.

---

## 6. Client-Side Architecture

### Module Responsibilities

```
┌──────────────────────────────────────────────────┐
│                    UI Layer                       │
│  React Components + Zustand Stores               │
│  (drag-drop, progress, peer list, error states)  │
├──────────┬──────────────────────┬────────────────┤
│  Signaling Client              │  WebRTC Manager │
│  - WS connect/disconnect       │  - PC lifecycle │
│  - Send/receive SignalMessage   │  - DC create    │
│  - Room join/leave             │  - File chunking │
│  - SDP/ICE relay               │  - Backpressure  │
├──────────┴──────────────────────┴────────────────┤
│                 Browser APIs                      │
│  WebSocket | RTCPeerConnection | File API         │
│  Blob | ArrayBuffer | IndexedDB (future)          │
└──────────────────────────────────────────────────┘
```

### Zustand Store Domains

| Store             | State Managed                                         |
| ----------------- | ----------------------------------------------------- |
| `connectionStore` | WS status, room ID, peer list                         |
| `transferStore`   | File metadata, progress, chunks sent/received, errors |
| `uiStore`         | Modal states, error messages, copy-link feedback      |

---

## 7. Hard Limits (MVP)

| Constraint          | Value                 | Rationale                             |
| ------------------- | --------------------- | ------------------------------------- |
| Max file size       | ~2 GB                 | Browser `Blob` / `ArrayBuffer` limits |
| Max peers           | 1 (MVP) → 5 (Phase 3) | Bandwidth + complexity                |
| Room lifetime       | 30 minutes            | Prevent stale rooms                   |
| Chunk size          | 64–256 KB             | Stable across browsers                |
| Browser support     | Chrome, Firefox       | WebRTC API parity                     |
| Signaling transport | JSON over WS          | Human-readable, debuggable            |
