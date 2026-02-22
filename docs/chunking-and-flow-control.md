# nerdShare — Chunking, Backpressure & Flow Control

> The engineering behind reliable large-file transfer over WebRTC DataChannels.

---

## 1. Why Chunking Is Required

WebRTC DataChannels run SCTP, which has message size limits and browser-specific constraints:

| Problem                     | Without Chunking                                            |
| --------------------------- | ----------------------------------------------------------- |
| Browser message size limits | SCTP max message ~256 KB (varies by browser)                |
| Memory pressure             | Loading a 2 GB file into a single `ArrayBuffer` = crash     |
| UI responsiveness           | Large `dc.send()` blocks the event loop                     |
| Progress tracking           | Impossible without discrete units                           |
| Resume capability           | Can't restart from "byte 743,291,002" without chunk indices |

---

## 2. Chunking Design

### Chunk Parameters

| Parameter       | MVP Value                         | Rationale                                                                              |
| --------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `chunkSize`     | 256 KB (262,144 bytes)            | Safe across Chrome, Firefox, Safari. Above SCTP fragmentation threshold for efficiency |
| `totalChunks`   | `Math.ceil(fileSize / chunkSize)` | Derived value                                                                          |
| Adaptive sizing | Phase 4+                          | Start with fixed size                                                                  |

### Reading Chunks from File

```typescript
async function readChunk(
  file: File,
  index: number,
  chunkSize: number,
): Promise<ArrayBuffer> {
  const start = index * chunkSize;
  const end = Math.min(start + chunkSize, file.size);
  const blob = file.slice(start, end);
  return blob.arrayBuffer();
}
```

`Blob.slice()` is **lazy** — it does not copy the file into memory. Only `arrayBuffer()` materializes the bytes for that single chunk.

### Message Framing

DataChannel messages are either **control** (JSON string) or **data** (binary `ArrayBuffer`):

```
┌─────────────────────────────┐
│ typeof event.data === "string" ?  │
│   → Parse as JSON control message │
│   → Types: FILE_META, HELLO_ACK,  │
│            TRANSFER_COMPLETE,      │
│            ERROR, PING/PONG        │
│                                    │
│ typeof event.data !== "string" ?   │
│   → Binary chunk (ArrayBuffer)     │
│   → Index inferred from order      │
│     (sequential push model)        │
└─────────────────────────────┘
```

**MVP**: chunk index is implicit (sequential order). No per-chunk header.

**Phase 2+**: Binary frame header for pull-based / resume model:

```
┌──────────────┬──────────────┬───────────────────┐
│ chunkIndex   │ payloadLen   │ payload bytes...   │
│ (4 bytes)    │ (4 bytes)    │ (variable)         │
│ Uint32       │ Uint32       │ ArrayBuffer        │
└──────────────┴──────────────┴───────────────────┘
```

---

## 3. Backpressure — The Non-Negotiable

### The Problem

`dc.send()` does **not** block. It buffers data internally. If you call `dc.send()` in a tight loop for a 1 GB file:

```
  for (let i = 0; i < totalChunks; i++) {
     dc.send(chunks[i]);  // Buffers up GBs in memory → tab crash
   }
```

### The Solution: `bufferedAmount` + `onbufferedamountlow`

```typescript
const HIGH_WATERMARK = 16 * 1024 * 1024; // 16 MB — pause threshold
const LOW_WATERMARK = 4 * 1024 * 1024; //  4 MB — resume threshold

dc.bufferedAmountLowThreshold = LOW_WATERMARK;

async function sendFile(file: File, dc: RTCDataChannel, meta: FileMeta) {
  for (let i = 0; i < meta.totalChunks; i++) {
    // BACKPRESSURE: wait if buffer is full
    if (dc.bufferedAmount > HIGH_WATERMARK) {
      await waitForBufferDrain(dc);
    }

    const chunk = await readChunk(file, i, meta.chunkSize);
    dc.send(chunk);

    // Update progress (throttled to avoid UI thrash)
    updateProgress(i + 1, meta.totalChunks);
  }

  dc.send(JSON.stringify({ type: "TRANSFER_COMPLETE", fileId: meta.fileId }));
}

function waitForBufferDrain(dc: RTCDataChannel): Promise<void> {
  return new Promise((resolve) => {
    const onLow = () => {
      dc.removeEventListener("bufferedamountlow", onLow);
      resolve();
    };
    dc.addEventListener("bufferedamountlow", onLow);
  });
}
```

### Watermark Values — Rationale

| Watermark | Value | Why                                                     |
| --------- | ----- | ------------------------------------------------------- |
| HIGH      | 16 MB | Enough buffer for throughput, small enough to not OOM   |
| LOW       | 4 MB  | Resume well before buffer drains to zero (avoid stalls) |

These values are tuned for:

- Typical broadband: 10–100 Mbps → 16 MB ≈ 1–13s of data
- Low bandwidth: 1–5 Mbps → 16 MB ≈ 25–130s of data (still safe)

### Per-Peer Backpressure (Phase 3)

Each peer gets independent flow control:

```typescript
const peerSessions: Map<string, PeerSession> = new Map();

// Each PeerSession has its own:
// - RTCDataChannel with its own bufferedAmount
// - Its own send loop
// - Its own pause/resume state
```

Slow Peer 1 does **not** block Peer 2's transfer.

---

## 4. Receiver-Side Memory Management

### The Problem

Peer receives all chunks and stores them in `chunks: ArrayBuffer[]`. For a 2 GB file, this array consumes ~2 GB of RAM.

### MVP Approach: In-Memory (With Guard Rails)

```typescript
const MAX_IN_MEMORY_SIZE = 500 * 1024 * 1024; // 500 MB soft limit

if (fileMeta.fileSize > MAX_IN_MEMORY_SIZE) {
  showWarning("Large file — your browser may become slow.");
}

// Collect chunks
const chunks: ArrayBuffer[] = [];
dc.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    chunks.push(event.data);
  }
};

// Assemble and download
function assembleAndDownload(chunks: ArrayBuffer[], meta: FileMeta) {
  const blob = new Blob(chunks, { type: meta.mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = meta.fileName;
  a.click();

  URL.revokeObjectURL(url);
  chunks.length = 0; // Free memory
}
```

### Phase 4+: File System Access API (Streaming to Disk)

Chrome supports `showSaveFilePicker()` → `FileSystemWritableFileStream`:

```typescript
// Write chunks directly to disk — no RAM accumulation
const handle = await showSaveFilePicker({
  suggestedName: meta.fileName,
});
const writable = await handle.createWritable();

dc.onmessage = async (event) => {
  if (event.data instanceof ArrayBuffer) {
    await writable.write(event.data);
    receivedChunks++;
    if (receivedChunks === meta.totalChunks) {
      await writable.close();
    }
  }
};
```

| Approach           | Max File Size     | RAM Usage      | Browser Support |
| ------------------ | ----------------- | -------------- | --------------- |
| In-memory Blob     | ~500 MB practical | `O(fileSize)`  | All             |
| File System Access | Multi-GB          | `O(chunkSize)` | Chrome 86+      |

---

## 5. Progress Tracking

### Sender Progress

```typescript
// Throttle UI updates to max 10/sec
let lastProgressUpdate = 0;
const PROGRESS_THROTTLE_MS = 100;

function updateProgress(sentChunks: number, totalChunks: number) {
  const now = Date.now();
  if (now - lastProgressUpdate < PROGRESS_THROTTLE_MS) return;
  lastProgressUpdate = now;

  const progress = sentChunks / totalChunks;
  const bytesTransferred = sentChunks * chunkSize;
  const elapsed = (now - transferStartTime) / 1000;
  const speed = bytesTransferred / elapsed; // bytes/sec
  const remaining = ((totalChunks - sentChunks) * chunkSize) / speed;

  transferStore.setState({
    progress,
    bytesTransferred,
    speed,
    estimatedTimeRemaining: remaining,
  });
}
```

### Speed Calculation

Use a sliding window for stable speed display:

```typescript
class SpeedTracker {
  private samples: { time: number; bytes: number }[] = [];
  private windowMs = 3000; // 3-second window

  addSample(bytes: number) {
    const now = Date.now();
    this.samples.push({ time: now, bytes });
    // Trim old samples
    this.samples = this.samples.filter((s) => now - s.time < this.windowMs);
  }

  getSpeed(): number {
    if (this.samples.length < 2) return 0;
    const oldest = this.samples[0];
    const newest = this.samples[this.samples.length - 1];
    const totalBytes = this.samples.reduce((sum, s) => sum + s.bytes, 0);
    const elapsed = (newest.time - oldest.time) / 1000;
    return elapsed > 0 ? totalBytes / elapsed : 0;
  }
}
```

---

## 6. Adaptive Chunk Sizing (Phase 4+)

Adjust chunk size based on network conditions:

```typescript
function adaptChunkSize(currentSpeed: number): number {
  if (currentSpeed > 10_000_000) return 512 * 1024; // >10 MB/s → 512 KB
  if (currentSpeed > 1_000_000) return 256 * 1024; // >1 MB/s  → 256 KB
  if (currentSpeed > 100_000) return 128 * 1024; // >100 KB/s → 128 KB
  return 64 * 1024; // slow → 64 KB
}
```

**Not in MVP** — fixed 256 KB is stable enough. Adaptive sizing adds complexity in chunk indexing and receiver reassembly when sizes vary.
