import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'

let io: Server | null = null

// A room name is either an auction id (joined via join-auction) or a
// `user:${id}` room (joined via identify). This tells them apart so watcher
// counts don't get computed for — or polluted by — the notification rooms.
function isAuctionRoom(room: string, socketId: string) {
  return room !== socketId && !room.startsWith('user:')
}

/**
 * Counts distinct watchers of an auction: sockets that have identified are
 * deduped by userId (so someone with two tabs open only counts once),
 * anonymous sockets are counted individually.
 */
function auctionWatcherCount(auctionId: string): number {
  if (!io) return 0
  const room = io.sockets.adapter.rooms.get(auctionId)
  if (!room) return 0

  const identities = new Set<string>()
  for (const socketId of room) {
    const socket = io.sockets.sockets.get(socketId)
    identities.add((socket?.data.userId as string | undefined) ?? socketId)
  }
  return identities.size
}

function broadcastWatcherCount(auctionId: string) {
  io?.to(auctionId).emit('auction:watchers', { auctionId, count: auctionWatcherCount(auctionId) })
}

export function initSocket(httpServer: HttpServer, clientUrl: string): Server {
  io = new Server(httpServer, {
    cors: { origin: clientUrl },
  })

  io.on('connection', (socket) => {
    socket.on('join-auction', (auctionId: unknown) => {
      if (typeof auctionId === 'string' && auctionId) {
        socket.join(auctionId)
        broadcastWatcherCount(auctionId)
      }
    })
    socket.on('leave-auction', (auctionId: unknown) => {
      if (typeof auctionId === 'string' && auctionId) {
        socket.leave(auctionId)
        broadcastWatcherCount(auctionId)
      }
    })
    socket.on('identify', (userId: unknown) => {
      if (typeof userId !== 'string' || !userId) return
      const previous = socket.data.userId as string | undefined
      if (previous && previous !== userId) socket.leave(`user:${previous}`)
      socket.data.userId = userId
      socket.join(`user:${userId}`)
      for (const room of socket.rooms) {
        if (isAuctionRoom(room, socket.id)) broadcastWatcherCount(room)
      }
    })
    socket.on('unidentify', () => {
      const previous = socket.data.userId as string | undefined
      if (previous) socket.leave(`user:${previous}`)
      socket.data.userId = undefined
      for (const room of socket.rooms) {
        if (isAuctionRoom(room, socket.id)) broadcastWatcherCount(room)
      }
    })

    // Socket.io removes the socket from all rooms before 'disconnect'
    // fires, so the room list has to be captured one tick earlier, in
    // 'disconnecting', to know which auctions need a recount afterward.
    socket.on('disconnecting', () => {
      socket.data.roomsAtDisconnect = [...socket.rooms].filter((room) => isAuctionRoom(room, socket.id))
    })
    socket.on('disconnect', () => {
      const rooms = socket.data.roomsAtDisconnect as string[] | undefined
      rooms?.forEach(broadcastWatcherCount)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io has not been initialized')
  return io
}
