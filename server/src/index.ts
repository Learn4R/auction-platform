import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { authenticate } from './middleware/auth.js'
import authRouter from './routes/auth.js'
import categoriesRouter from './routes/categories.js'
import itemsRouter from './routes/items.js'

const app = express()
const port = process.env.PORT ?? 3000

app.use(cors())
app.use(express.json())

app.get('/', (_req, res) => {
  res.json({ message: 'Server is running' })
})

app.use('/api/auth', authRouter)
app.use('/api/items', itemsRouter)
app.use('/api/categories', categoriesRouter)

app.get('/api/admin/ping', authenticate('admin'), (_req, res) => {
  res.json({ message: 'pong (admin only)' })
})

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
