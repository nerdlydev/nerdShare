// ─── Signaling Protocol Contracts ───
// Shared between apps/web and apps/signaling
// Discriminated union — exhaustive switch guaranteed by TypeScript

// ─── Signaling Messages (over WebSocket) ───

export type SignalMessage =
  | { type: "JOIN_ROOM"; roomId: string; userId: string; publicKey: string }
  | {
      type: "ROOM_JOINED";
      roomId: string;
      userId: string;
      peers: { userId: string; publicKey: string }[];
    }
  | { type: "PEER_JOINED"; roomId: string; userId: string; publicKey: string }
  | { type: "PEER_LEFT"; roomId: string; userId: string }
  | {
      type: "ENCRYPTED";
      roomId: string;
      fromUserId: string;
      toUserId: string;
      payload: string; // Base64 encoded RSA ciphertext
    }
  | { type: "PING"; timestamp: number } // Server → Client
  | { type: "PONG"; timestamp: number } // Client → Server
  | { type: "ERROR"; message: string; code?: string };

// ─── Decrypted Payload ───
// This is the actual data inside the ENCRYPTED message payload
export type SignalPayload =
  | { type: "OFFER"; sdp: RTCSessionDescriptionInit }
  | { type: "ANSWER"; sdp: RTCSessionDescriptionInit }
  | { type: "ICE_CANDIDATE"; candidate: RTCIceCandidateInit };

// Messages the client sends TO the server
export type ClientMessage = Extract<
  SignalMessage,
  { type: "JOIN_ROOM" | "ENCRYPTED" | "PONG" }
>;

// Messages the server sends TO the client
export type ServerMessage = Extract<
  SignalMessage,
  {
    type:
      | "ROOM_JOINED"
      | "PEER_JOINED"
      | "PEER_LEFT"
      | "ENCRYPTED"
      | "PING"
      | "ERROR";
  }
>;

// ─── Error Codes ───

export const SignalErrorCode = {
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_EXPIRED: "ROOM_EXPIRED",
  ROOM_FULL: "ROOM_FULL",
  INVALID_MESSAGE: "INVALID_MESSAGE",
  PEER_NOT_FOUND: "PEER_NOT_FOUND",
} as const;

export type SignalErrorCode =
  (typeof SignalErrorCode)[keyof typeof SignalErrorCode];

// ─── Room Config ───

export const ROOM_DEFAULTS = {
  MAX_PEERS: 1, // MVP: 1-to-1 only
  TTL_MS: 30 * 60 * 1000, // 30 minutes
  MAX_MESSAGE_SIZE: 10 * 1024, // 10 KB signaling message limit
} as const;

// ─── DataChannel Control Messages (over RTCDataChannel, NOT WebSocket) ───

export interface FileMeta {
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  chunkSize: number;
  totalChunks: number;
}

export type DCControlMessage =
  | ({ type: "FILE_META" } & FileMeta)
  | { type: "HELLO_ACK"; fileId: string }
  | { type: "TRANSFER_COMPLETE"; fileId: string }
  | { type: "DC_ERROR"; message: string }
  | { type: "PAUSE"; fileId: string }
  | { type: "RESUME"; fileId: string }
  | { type: "CANCEL"; fileId: string };
