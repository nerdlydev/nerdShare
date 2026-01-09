// Signaling contracts - discriminated union for type safety

export type SignalMessage =
  | { type: "JOIN_ROOM"; roomId: string; userId: string }
  | { type: "ROOM_JOINED"; roomId: string; userId: string; peers: string[] }
  | { type: "PEER_JOINED"; roomId: string; userId: string }
  | { type: "PEER_LEFT"; roomId: string; userId: string }
  | {
      type: "OFFER";
      roomId: string;
      fromUserId: string;
      toUserId: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "ANSWER";
      roomId: string;
      fromUserId: string;
      toUserId: string;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "ICE_CANDIDATE";
      roomId: string;
      fromUserId: string;
      toUserId: string;
      candidate: RTCIceCandidateInit;
    }
  | { type: "ERROR"; message: string; code?: string };

// Helper type for client-to-server messages
export type ClientMessage = Extract<
  SignalMessage,
  { type: "JOIN_ROOM" | "OFFER" | "ANSWER" | "ICE_CANDIDATE" }
>;

// Helper type for server-to-client messages
export type ServerMessage = Extract<
  SignalMessage,
  {
    type:
      | "ROOM_JOINED"
      | "PEER_JOINED"
      | "PEER_LEFT"
      | "OFFER"
      | "ANSWER"
      | "ICE_CANDIDATE"
      | "ERROR";
  }
>;
