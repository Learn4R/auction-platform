import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'

let io: Server | null = null

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? '*' },
  })

  io.on('connection', (socket) => {
    socket.on('join-auction', (auctionId: unknown) => {
      if (typeof auctionId === 'string' && auctionId) socket.join(auctionId)
    })
    socket.on('leave-auction', (auctionId: unknown) => {
      if (typeof auctionId === 'string' && auctionId) socket.leave(auctionId)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io has not been initialized')
  return io
}
