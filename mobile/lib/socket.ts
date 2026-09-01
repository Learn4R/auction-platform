import { io, type Socket } from 'socket.io-client'

// Same server, same connection the web client makes (client/src/lib/socket.ts)
// — one shared Socket.io singleton, auto-connecting, reused across every
// screen that needs it. `transports: ['websocket']` skips the initial HTTP
// long-polling handshake, which is the standard recommendation for React
// Native: RN ships a real WebSocket global, so there's no need for the
// polling fallback browsers sometimes need.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_URL, { autoConnect: true, transports: ['websocket'] })
  }
  return socket
}
