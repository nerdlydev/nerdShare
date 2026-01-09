# nerdShare

A privacy-first, browser-based P2P file sharing app using WebRTC DataChannels and WebSocket signaling.

## MVP Scope

- Browser-based P2P file sharing
- WebRTC DataChannels for direct peer-to-peer transfer
- WebSocket signaling server for connection establishment
- No server-side file storage
- Focus on reliability over features

## What is NOT included yet

- WebRTC implementation
- File transfer logic
- UI styling
- Database
- Authentication
- CI/CD
- Advanced tooling

## Architecture

- Monorepo structure with separate runtimes
- Frontend: React + Vite + TypeScript
- Backend: Bun + TypeScript WebSocket server
- Shared: TypeScript package for contracts

## Development

### Terminal 1

```bash
cd packages/shared && bun run dev
```

### Terminal 2

```bash
cd apps/web && bun run dev
```

### Terminal 3

```bash
cd apps/signaling && bun run dev
```
