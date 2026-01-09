import { SignalingMessage, SignalingMessageType } from "@nerdshare/shared";

const PORT = 8080;

const server = Bun.serve({
  port: PORT,
  websocket: {
    open(ws) {
      console.log("Client connected");
    },
    message(ws, message) {
      console.log("Received message:", message);
      // Placeholder: echo back for now
      ws.send(message);
    },
    close(ws) {
      console.log("Client disconnected");
    },
  },
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response("WebSocket signaling server");
  },
});

console.log(`Signaling server running on port ${PORT}`);
