import { createServer } from 'node:http'
import dotenv from 'dotenv'

// override:true because src/lib/prisma.ts (imported by every route module
// under test) does its own `import 'dotenv/config'`, which loads .env and
// — by dotenv's default — never overrides a variable that's already set.
// Loading .env.test first, with override, guarantees the test values win
// regardless of which module happens to import dotenv first.
dotenv.config({ path: '.env.test', override: true })

const { initSocket } = await import('../src/realtime/io.js')

// The bidding engine broadcasts over Socket.io as a side effect of a
// successful bid (see src/realtime/bidding.ts). Tests never connect a real
// socket, so this just gives getIO() a real, harmless target to emit into
// (emitting to an empty room is a no-op) instead of throwing
// "Socket.io has not been initialized".
initSocket(createServer(), 'http://localhost:5173')
