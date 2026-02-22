# nerdShare — Development Roadmap

> Phased plan from WebRTC pipe validation to production-ready P2P file sharing.
>
> **Assumptions**: Solo developer, ~2–3 hrs/day weekdays + weekends. Total horizon: ~4 months.

---

## Phase Overview

| Phase | Focus                    | Duration       | Exit Criteria                          |
| ----- | ------------------------ | -------------- | -------------------------------------- |
| **0** | Project Foundation       | Week 1         | Scope frozen, repo ready               |
| **1** | Signaling & Connection   | Weeks 2–3      | Two browsers connected across networks |
| **2** | Raw File Transfer        | Weeks 4–5      | 500 MB+ file transfers correctly       |
| **3** | Flow Control & Stability | Weeks 6–7      | No crashes under slow networks         |
| **4** | Minimal UX               | Week 8         | New user understands in <10 seconds    |
| —     | **🎯 MVP COMPLETE**      | End of Month 2 | —                                      |
| **5** | Resume Support           | Weeks 9–10     | Refresh → resume works                 |
| **6** | Multi-Peer               | Weeks 11–12    | 1→3 peers reliably                     |
| **7** | TURN & Networking        | Week 13        | ~95% connection success                |
| **8** | PWA & Offline Shell      | Week 14        | Installable, app shell works           |
| **9** | Security & Polish        | Weeks 15–16    | Demo-ready, privacy-reviewed           |

---

## Phase 0: Project Foundation (Week 1)

> Goal: Set boundaries so the project doesn't derail later.

### Deliverables

| Task                                | Output                                 |
| ----------------------------------- | -------------------------------------- |
| Define MVP scope                    | Written scope in README                |
| Tech stack finalization             | Locked decisions (this doc)            |
| Repo setup (monorepo)               | Clean structure, workspaces configured |
| Shared package with signaling types | `packages/shared/src/signaling.ts`     |
| Flow diagrams (rough)               | `docs/flows.md`                        |
| State machine definitions           | `docs/state-machine.md`                |

### Exit Criteria

- [ ] Can explain nerdShare in 2 minutes
- [ ] No open "we'll decide later" items
- [ ] `bun install` succeeds, all packages link correctly
- [ ] Shared types import in both `web` and `signaling`

### Status: COMPLETE

Repo scaffolded. Shared signaling types defined. Documentation written.

---

## Phase 1: Signaling & Connection (Weeks 2–3)

> **Highest risk.** If this fails, nothing else matters.

### Deliverables

| Task                       | Description                           | Files                                  |
| -------------------------- | ------------------------------------- | -------------------------------------- |
| WebSocket signaling server | Room create/join, connection handling | `apps/signaling/src/server.ts`         |
| Signaling message routing  | OFFER/ANSWER/ICE relay                | `apps/signaling/src/server.ts`         |
| Peer discovery             | JOIN_ROOM → PEER_JOINED notification  | `apps/signaling/src/server.ts`         |
| Client signaling module    | WS connect, send/receive, reconnect   | `apps/web/src/lib/signaling-client.ts` |
| WebRTC connection module   | PC creation, DC setup, ICE handling   | `apps/web/src/lib/webrtc-manager.ts`   |
| Disconnect detection       | Clean exits, error logging            | Both                                   |

### Week 2 Day-by-Day

| Day | Task                                                        | Outcome                       |
| --- | ----------------------------------------------------------- | ----------------------------- |
| 1   | Signaling server skeleton — WS accept, log, echo            | Clients connect               |
| 2   | Room logic — JOIN_ROOM, room map, peer tracking             | Rooms created/joined          |
| 3   | Message routing — OFFER/ANSWER/ICE relay                    | SDP flows visible in logs     |
| 4   | Client signaling module — connect, send, receive, reconnect | Browser ↔ server communicates |
| 5   | Integration — client sends JOIN_ROOM, server replies        | End-to-end signaling          |

### Week 3 Day-by-Day

| Day | Task                                                       | Outcome               |
| --- | ---------------------------------------------------------- | --------------------- |
| 1   | RTCPeerConnection setup — create PC, create DC             | PC objects created    |
| 2   | Offer/Answer flow — createOffer → signaling → createAnswer | SDP exchanged         |
| 3   | ICE candidate exchange — trickle ICE through signaling     | ICE completes         |
| 4   | DataChannel validation — send text, receive text           | Messages flow P2P     |
| 5   | Cross-network test + hardening — different WiFi networks   | Stable across NATs    |
| 6–7 | Retry logic, zombie cleanup, edge case fixes               | Production-ready pipe |

### Exit Criteria

- [ ] Two browsers connect across different networks
- [ ] DataChannel opens reliably
- [ ] Text messages exchange P2P
- [ ] Reconnect works within same session
- [ ] No silent failures — all errors logged
- [ ] `chrome://webrtc-internals` shows clean lifecycle

### ⚠️ Decision Gate

> If Week 3 ends and the pipe is unstable → **DO NOT PROCEED**. Fix the pipe.
> If stable → file transfer becomes an engineering problem, not a research problem.

---

## Phase 2: Raw File Transfer (Weeks 4–5)

> No UI polish. Pure data correctness.

### Deliverables

| Task                        | Description                           | Files                                   |
| --------------------------- | ------------------------------------- | --------------------------------------- |
| File chunking               | `Blob.slice()` → `ArrayBuffer` chunks | `apps/web/src/lib/file-chunker.ts`      |
| Sequential sending          | Send chunks in order over DC          | `apps/web/src/lib/transfer-sender.ts`   |
| Receiver reassembly         | Collect chunks → `Blob` → download    | `apps/web/src/lib/transfer-receiver.ts` |
| Integrity verification      | Size match, chunk count match         | Transfer logic                          |
| Binary/text message framing | typeof check for control vs data      | Transfer logic                          |

### Key Implementation Details

```typescript
// Sender core loop (simplified)
for (let i = 0; i < totalChunks; i++) {
  const chunk = await readChunk(file, i, chunkSize);
  dc.send(chunk);
}

// Receiver core handler
dc.onmessage = (event) => {
  if (typeof event.data === "string") handleControl(event.data);
  else chunks.push(event.data);
};
```

### Exit Criteria

- [ ] 1 MB file transfers and downloads correctly
- [ ] 100 MB file transfers correctly
- [ ] 500 MB+ file transfers correctly
- [ ] Downloaded file is byte-identical to source
- [ ] Browser tab stays responsive during transfer
- [ ] No data in server logs — only signaling metadata

---

## Phase 3: Flow Control & Stability (Weeks 6–7)

> This separates demos from real apps.

### Deliverables

| Task                     | Description                                     |
| ------------------------ | ----------------------------------------------- |
| Backpressure handling    | `bufferedAmount` / `bufferedAmountLowThreshold` |
| Watermark tuning         | HIGH=16MB, LOW=4MB, test and adjust             |
| Pause/resume (session)   | User-initiated pause, programmatic resume       |
| Error recovery           | Partial failure handling, retry where safe      |
| Network throttling tests | Chrome DevTools throttling simulation           |
| Progress tracking        | Accurate percentage, speed, ETA                 |

### Exit Criteria

- [ ] No crashes under "Slow 3G" DevTools throttling
- [ ] Transfers recover from brief network hiccups
- [ ] `bufferedAmount` never exceeds 32 MB
- [ ] Progress display is accurate and stable
- [ ] Speed display doesn't wildly fluctuate (sliding window)

---

## Phase 4: Minimal UX (Week 8)

> Only now do users touch it.

### Deliverables

| Task              | Description                           |
| ----------------- | ------------------------------------- |
| Host page         | Drag-and-drop zone, file info display |
| Link generation   | Copy button + QR code                 |
| Peer page         | "Downloading…" + progress bar         |
| Connection states | Visual indicators for all states      |
| Error messaging   | Clear, actionable error messages      |
| Routing           | Hash-based routing (`#/r/<roomId>`)   |

### UI States to Implement

| State            | Host UI                | Peer UI               |
| ---------------- | ---------------------- | --------------------- |
| No file          | Drop zone prominent    | N/A                   |
| File selected    | File info + share link | N/A                   |
| Waiting for peer | "Share this link"      | "Connecting…"         |
| Connected        | "Connected" ✓          | "Connected" ✓         |
| Transferring     | Upload progress bar    | Download progress bar |
| Complete         | "Transfer complete"    | "Download" button     |
| Error            | Error + retry          | Error + retry         |

### Exit Criteria

- [ ] New user understands the app in under 10 seconds
- [ ] Zero documentation needed
- [ ] All failure states have clear, human-readable messages
- [ ] Works on mobile viewport (responsive, not mobile-optimized)

---

## 🎯 MVP COMPLETE (End of Month 2)

At this point:

- nerdShare works for 1:1 transfers
- P2P is real (no server file handling)
- You can demo confidently
- Codebase is clean and well-tested

---

## Phase 5: Resume Support (Weeks 9–10)

> Hard but high value.

### Deliverables

| Task                  | Description                                          |
| --------------------- | ---------------------------------------------------- |
| Chunk index tracking  | Sender and receiver track which chunks sent/received |
| IndexedDB persistence | Store received chunks + bitmap on peer side          |
| Reconnect handshake   | After reconnect, exchange "what chunks do you have?" |
| Pull-based protocol   | `REQUEST_RANGE` message for missing chunks           |
| Partial resend logic  | Only send missing chunks                             |
| Resume UX             | "Resuming from 67%…"                                 |

### Protocol Addition

```typescript
// New DC control messages for resume
| { type: "CHUNK_BITMAP"; fileId: string; bitmap: Uint8Array }
| { type: "REQUEST_RANGE"; fileId: string; startChunk: number; endChunk: number }
```

### Exit Criteria

- [ ] Peer refreshes browser → reconnects → resume works
- [ ] No duplicate chunk sends
- [ ] IndexedDB cleanup on transfer complete

---

## Phase 6: Multi-Peer Sharing (Weeks 11–12)

### Deliverables

| Task                    | Description                                    |
| ----------------------- | ---------------------------------------------- |
| Peer caps               | `maxPeers` enforcement (default: 5)            |
| Per-peer connections    | Independent PC/DC per peer                     |
| Shared chunk scheduling | Fair round-robin or parallel sending           |
| Peer list UI            | Show all connected peers + individual progress |
| Failure isolation       | One peer failure ≠ all peers fail              |

### Exit Criteria

- [ ] 1 host → 3 peers transfers reliably
- [ ] Sender load stays predictable
- [ ] Peer 2 is not blocked when Peer 1 is slow
- [ ] Peer disconnect only affects that peer

---

## Phase 7: TURN & Networking Hardening (Week 13)

### Deliverables

| Task                      | Description                              |
| ------------------------- | ---------------------------------------- |
| TURN integration          | coturn deploy, ICE config update         |
| Connection type detection | Direct vs relay indicator                |
| Rate limiting             | TURN credential rotation, usage caps     |
| UDP + TCP/TLS fallback    | TURN on port 443 for corporate firewalls |

### Exit Criteria

- [ ] ~95% connection success rate
- [ ] TURN used only when direct fails
- [ ] Connection type visible in UI
- [ ] No TURN abuse (credentials rotated)

---

## Phase 8: PWA & Offline Shell (Week 14)

### Deliverables

| Task             | Description                                             |
| ---------------- | ------------------------------------------------------- |
| PWA manifest     | `manifest.json`, icons, theme                           |
| Service worker   | Cache app shell for instant load                        |
| Install prompt   | "Add to Home Screen"                                    |
| Offline behavior | App loads offline, shows "needs connection" for sharing |

### Exit Criteria

- [ ] Lighthouse PWA score > 90
- [ ] App installs on Android + desktop Chrome
- [ ] Loads instantly on repeat visits

---

## Phase 9: Security, Privacy & Polish (Weeks 15–16)

### Deliverables

| Task                    | Description                                |
| ----------------------- | ------------------------------------------ |
| Room expiry enforcement | TTL cleanup, no stale rooms                |
| Rate limiting           | Room creation, connection flood protection |
| Security review         | No file data leaks, clean SDP logging      |
| Privacy documentation   | What data goes where                       |
| UI polish               | Animations, dark mode, landing page        |
| Demo preparation        | Screencast, README update, deploy          |

### Exit Criteria

- [ ] No file data in any server log
- [ ] Room TTL enforced and tested
- [ ] Rate limits prevent abuse
- [ ] Landing page communicates value clearly
- [ ] Deployed and accessible

---

## Month-View Summary

```
Month 1
├─ Week 1:  Project foundation
├─ Week 2:  Signaling server + client
├─ Week 3:  WebRTC connection + DataChannel
└─ Week 4:  File transfer core

Month 2
├─ Week 5:  Chunking & integrity
├─ Week 6:  Backpressure & flow control
├─ Week 7:  Stability testing
└─ Week 8:  Minimal UX
  🎯 MVP DONE

Month 3
├─ Week 9:  Resume support (IndexedDB + bitmap)
├─ Week 10: Resume hardening
├─ Week 11: Multi-peer base
└─ Week 12: Multi-peer stability

Month 4
├─ Week 13: TURN & networking
├─ Week 14: PWA
├─ Week 15: Security & polish
└─ Week 16: Demo & launch
```

---

## Risk Management

| Risk                    | Likelihood | Impact   | Mitigation                               |
| ----------------------- | ---------- | -------- | ---------------------------------------- |
| WebRTC pipe instability | Medium     | Critical | Week-1 gate — don't proceed until stable |
| Bun WS bugs             | Low        | Medium   | Simple server, easy migration to Node    |
| Browser memory OOM      | Medium     | High     | File size warnings, FS Access API later  |
| NAT traversal failures  | High       | Medium   | TURN integration in Phase 7              |
| Scope creep             | High       | Critical | Locked MVP scope, explicit non-goals     |
| Solo developer burnout  | Medium     | High     | Phased delivery, visible progress        |
