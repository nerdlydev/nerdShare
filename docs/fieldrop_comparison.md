# Architecture Comparison: nerdShare vs. Filedrop

A comparative analysis of the current `nerdShare` implementation against the established `filedrop` project.

| Feature              | nerdShare                         | Filedrop                         | Winner/Lesson                             |
| :------------------- | :-------------------------------- | :------------------------------- | :---------------------------------------- |
| **Tech Stack**       | React 18, Vite, Bun               | Preact, MobX, Fastify            | **nerdShare**: Modern, faster dev loop.   |
| **Discovery**        | Explicit Room IDs (Public links)  | Automatic "Network" (IP-based)   | **Filedrop**: Better for local transfers. |
| **Encryption**       | Manual Hybrid (RSA + AES-GCM)     | Library-based (`matcrypt`)       | **nerdShare**: Native, zero-dependency.   |
| **Socket Stability** | Basic WebSocket                   | 5s Heartbeats (Ping/Pong)        | **Filedrop**: Prevents idle disconnects.  |
| **Cleanliness**      | Basic close handlers              | Periodic broken-client cleanup   | **Filedrop**: More robust server memory.  |
| **Flow Control**     | 512KB chunks, Polling fallback    | 64KB chunks, `bufferedAmountLow` | **nerdShare**: Faster on high-bandwidth.  |
| **Persistence**      | Volatile (UUID resets on refresh) | Persistent IDs via Seed/Secrets  | **Filedrop**: Seamless reconnection.      |

---

## What we can learn/implement from Filedrop

### 1. The "Network" Concept (Zero-Configuration)

Filedrop groups users automatically if they share the same external IP address.

- **Why:** In `nerdShare`, you always have to copy/paste a link. If two people are in the same room, they should just "see" each other.
- **Action:** Implement a "Local Peer Discovery" mode.

### 2. High-Frequency Heartbeats

Filedrop's server pings every 5 seconds.

- **Why:** Mobile browsers and Load Balancers (Nginx/Cloudflare) kill silent WebSockets.
- **Action:** Add a heartbeat interval to `signaling-client.ts` and `server.ts`.

### 3. Client & Server Maintenance

Filedrop has intervals to prune inactive clients.

- **Why:** Prevents "ghost" peers from showing up in the UI after a tab crashes.
- **Action:** Implement an "Inactivity Pruning" loop on the signaling server.

### 4. Wake Lock (Inspired by ToffeeShare logs)

ToffeeShare explicitly requests a Wake Lock.

- **Why:** Chrome throttles JS in background tabs, which kills file transfer speeds.
- **Action:** Implement the Screen Wake Lock API during active transfers.

---

## Suggested Priority Roadmap

1.  **[Stability]** Signaling Heartbeats (Stop random disconnects).
2.  **[Reliability]** Wake Lock (Stop background throttling).
3.  **[UX]** Local Discovery (Automatic grouping).
4.  **[UX]** Persistent Identity (Stay joined after refresh).
