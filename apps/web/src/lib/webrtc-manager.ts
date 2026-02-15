import type { ServerMessage } from "@nerdshare/shared";
import { SignalingClient } from "./signaling-client";

// ─── Types ───

export type ConnectionState =
  | "idle"
  | "signaling"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";

export type PeerRole = "host" | "peer";

interface WebRTCManagerOptions {
  signalingUrl: string;
  role: PeerRole;
  roomId: string;
  userId: string;
  onStateChange?: (state: ConnectionState) => void;
  onDataChannelOpen?: (dc: RTCDataChannel) => void;
  onDataChannelMessage?: (event: MessageEvent) => void;
  onDataChannelClose?: () => void;
  onError?: (error: string) => void;
}

// ─── ICE Configuration ───

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    // Google STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },

    // Metered STUN
    { urls: "stun:stun.relay.metered.ca:80" },

    // Metered TURN (Account 1)
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "3ccc935bfa071ac1d0cada67",
      credential: "OGSbvwK4SFUv819w",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "3ccc935bfa071ac1d0cada67",
      credential: "OGSbvwK4SFUv819w",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "3ccc935bfa071ac1d0cada67",
      credential: "OGSbvwK4SFUv819w",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "3ccc935bfa071ac1d0cada67",
      credential: "OGSbvwK4SFUv819w",
    },

    // Metered TURN (Account 2)
    {
      urls: "turn:global.relay.metered.ca:80",
      username: "eedbaf0ea6a45f9345faba05",
      credential: "trn4c73yh+2EjGp4",
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: "eedbaf0ea6a45f9345faba05",
      credential: "trn4c73yh+2EjGp4",
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: "eedbaf0ea6a45f9345faba05",
      credential: "trn4c73yh+2EjGp4",
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: "eedbaf0ea6a45f9345faba05",
      credential: "trn4c73yh+2EjGp4",
    },

    // ExpressTurn
    { urls: "stun:free.expressturn.com:3478" },
    {
      urls: "turn:free.expressturn.com:3478?transport=tcp",
      username: "000000002086537724",
      credential: "PrDBkaTaCzeQDJBfGDjGGB6yDhg=",
    },

    // TeamAssist TURN
    {
      urls: "turn:turn.myteamassist.com",
      username: "myteamassist",
      credential: "myteam@123",
    },
  ],
  iceCandidatePoolSize: 10,
};

// ─── WebRTC Manager ───

export class WebRTCManager {
  private signaling: SignalingClient;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private options: WebRTCManagerOptions;
  private _state: ConnectionState = "idle";
  private remotePeerId: string | null = null;

  constructor(options: WebRTCManagerOptions) {
    this.options = options;

    this.signaling = new SignalingClient({
      url: options.signalingUrl,
      onMessage: (msg) => this.handleSignalingMessage(msg),
      onStatusChange: (status) => {
        console.log(`[webrtc] signaling status: ${status}`);
        if (status === "connected") {
          // Join the room once connected
          this.signaling.send({
            type: "JOIN_ROOM",
            roomId: this.options.roomId,
            userId: this.options.userId,
          });
        }
      },
    });
  }

  // ── Public API ──

  get state(): ConnectionState {
    return this._state;
  }

  get dataChannel(): RTCDataChannel | null {
    return this.dc;
  }

  start(): void {
    this.signaling.connect();
  }

  stop(): void {
    this.cleanup();
    this.signaling.disconnect();
    this.setState("idle");
  }

  // ── Signaling Message Handler ──

  private handleSignalingMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case "ROOM_JOINED":
        console.log(
          `[webrtc] joined room "${msg.roomId}" — peers: [${msg.peers.join(", ")}]`,
        );
        // If we're the host and there are already peers, initiate connection
        if (this.options.role === "host" && msg.peers.length > 0) {
          this.remotePeerId = msg.peers[0];
          this.initiateConnection(this.remotePeerId);
        }
        break;

      case "PEER_JOINED":
        console.log(`[webrtc] peer joined: ${msg.userId}`);
        // Host initiates connection when a new peer joins
        if (this.options.role === "host") {
          this.remotePeerId = msg.userId;
          this.initiateConnection(msg.userId);
        }
        break;

      case "PEER_LEFT":
        console.log(`[webrtc] peer left: ${msg.userId}`);
        if (msg.userId === this.remotePeerId) {
          this.cleanup();
          this.setState("disconnected");
          this.options.onError?.("Peer disconnected");
        }
        break;

      case "OFFER":
        console.log(`[webrtc] received OFFER from ${msg.fromUserId}`);
        this.remotePeerId = msg.fromUserId;
        this.handleOffer(msg.fromUserId, msg.sdp);
        break;

      case "ANSWER":
        console.log(`[webrtc] received ANSWER from ${msg.fromUserId}`);
        this.handleAnswer(msg.sdp);
        break;

      case "ICE_CANDIDATE":
        this.handleRemoteIceCandidate(msg.candidate);
        break;

      case "ERROR":
        console.error(`[webrtc] signaling error: ${msg.message} (${msg.code})`);
        this.options.onError?.(msg.message);
        break;
    }
  }

  // ── Connection Setup (Host / Initiator) ──

  private async initiateConnection(peerId: string): Promise<void> {
    this.setState("signaling");
    this.createPeerConnection();

    if (!this.pc) return;

    // Host creates the DataChannel
    this.dc = this.pc.createDataChannel("file", { ordered: true });
    this.setupDataChannelHandlers(this.dc);

    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

      this.signaling.send({
        type: "OFFER",
        roomId: this.options.roomId,
        fromUserId: this.options.userId,
        toUserId: peerId,
        sdp: this.pc.localDescription!,
      });

      console.log(`[webrtc] offer sent to ${peerId}`);
    } catch (err) {
      console.error("[webrtc] failed to create offer", err);
      this.setState("failed");
      this.options.onError?.("Failed to create WebRTC offer");
    }
  }

  // ── Handle Incoming Offer (Peer / Responder) ──

  private async handleOffer(
    fromUserId: string,
    sdp: RTCSessionDescriptionInit,
  ): Promise<void> {
    this.setState("signaling");
    this.createPeerConnection();

    if (!this.pc) return;

    // Peer receives DataChannel via ondatachannel (set in createPeerConnection)

    try {
      await this.pc.setRemoteDescription(sdp);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      this.signaling.send({
        type: "ANSWER",
        roomId: this.options.roomId,
        fromUserId: this.options.userId,
        toUserId: fromUserId,
        sdp: this.pc.localDescription!,
      });

      console.log(`[webrtc] answer sent to ${fromUserId}`);
    } catch (err) {
      console.error("[webrtc] failed to handle offer", err);
      this.setState("failed");
      this.options.onError?.("Failed to process WebRTC offer");
    }
  }

  // ── Handle Incoming Answer ──

  private async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.setRemoteDescription(sdp);
      console.log("[webrtc] remote description set (answer)");
    } catch (err) {
      console.error("[webrtc] failed to set remote description", err);
    }
  }

  // ── ICE Candidate Handling ──

  private async handleRemoteIceCandidate(
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(candidate);
    } catch (err) {
      console.error("[webrtc] failed to add ICE candidate", err);
    }
  }

  // ── PeerConnection Setup ──

  private createPeerConnection(): void {
    // Cleanup any existing connection
    if (this.pc) {
      this.pc.close();
    }

    this.pc = new RTCPeerConnection(ICE_CONFIG);

    // ICE candidate trickle
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.remotePeerId) {
        this.signaling.send({
          type: "ICE_CANDIDATE",
          roomId: this.options.roomId,
          fromUserId: this.options.userId,
          toUserId: this.remotePeerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Connection state tracking
    this.pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const state = this.pc.connectionState;
      console.log(`[webrtc] connection state: ${state}`);

      switch (state) {
        case "connecting":
          this.setState("connecting");
          break;
        case "connected":
          this.setState("connected");
          break;
        case "disconnected":
          this.setState("disconnected");
          break;
        case "failed":
          this.setState("failed");
          this.options.onError?.("WebRTC connection failed");
          break;
        case "closed":
          this.setState("idle");
          break;
      }
    };

    // ICE state logging
    this.pc.oniceconnectionstatechange = () => {
      if (!this.pc) return;
      console.log(`[webrtc] ICE state: ${this.pc.iceConnectionState}`);
    };

    // Peer side: receive DataChannel
    this.pc.ondatachannel = (event) => {
      console.log("[webrtc] received DataChannel from host");
      this.dc = event.channel;
      this.setupDataChannelHandlers(this.dc);
    };
  }

  // ── DataChannel Handlers ──

  private setupDataChannelHandlers(dc: RTCDataChannel): void {
    dc.binaryType = "arraybuffer";

    dc.onopen = () => {
      console.log("[webrtc] DataChannel open");
      this.setState("connected");
      this.options.onDataChannelOpen?.(dc);
    };

    dc.onmessage = (event) => {
      this.options.onDataChannelMessage?.(event);
    };

    dc.onclose = () => {
      console.log("[webrtc] DataChannel closed");
      this.options.onDataChannelClose?.();
    };

    dc.onerror = (event) => {
      console.error("[webrtc] DataChannel error", event);
      this.options.onError?.("DataChannel error");
    };
  }

  // ── Cleanup ──

  private cleanup(): void {
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.remotePeerId = null;
  }

  // ── State ──

  private setState(state: ConnectionState): void {
    if (this._state === state) return;
    console.log(`[webrtc] state: ${this._state} → ${state}`);
    this._state = state;
    this.options.onStateChange?.(state);
  }
}
