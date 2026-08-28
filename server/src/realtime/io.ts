import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'

let io: Server | null = null

export function initSocket(httpServer: HttpServer, clientUrl: string): Server {
  io = new Server(httpServer, {
    cors: { origin: clientUrl },
  })

  io.on('connection', (socket) => {
    socket.on('join-auction', (auctionId: unknown) => {
      if (typeof auctionId === 'string' && auctionId) socket.join(auctionId)
    })
    socket.on('leave-auction', (auctionId: unknown) => {
      if (typeof auctionId === 'string' && auctionId) socket.leave(auctionId)
    })
    socket.on('identify', (userId: unknown) => {
      if (typeof userId !== 'string' || !userId) return
      const previous = socket.data.userId as string | undefined
      if (previous && previous !== userId) socket.leave(`user:${previous}`)
      socket.data.userId = userId
      socket.join(`user:${userId}`)
    })
    socket.on('unidentify', () => {
      const previous = socket.data.userId as string | undefined
      if (previous) socket.leave(`user:${previous}`)
      socket.data.userId = undefined
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io has not been initialized')
  return io
}
