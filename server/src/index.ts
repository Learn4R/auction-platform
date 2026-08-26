import 'dotenv/config'
import express from 'express'
import { authenticate } from './middleware/auth.js'
import authRouter from './routes/auth.js'

const app = express()
const port = process.env.PORT ?? 3000

app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running' })
})

app.use('/api/auth', authRouter)

app.get('/api/admin/ping', authenticate('admin'), (_req, res) => {
  res.json({ message: 'pong (admin only)' })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
