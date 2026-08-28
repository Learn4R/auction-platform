import { Router } from 'express'
import auditLogRouter from './auditLog.js'
import categoriesRouter from './categories.js'
import itemsRouter from './items.js'
import legalRouter from './legal.js'
import ordersRouter from './orders.js'
import payoutsRouter from './payouts.js'
import sellersRouter from './sellers.js'
import settingsRouter from './settings.js'
import statsRouter from './stats.js'

const router = Router()

router.use('/items', itemsRouter)
router.use('/legal', legalRouter)
router.use('/orders', ordersRouter)
router.use('/payouts', payoutsRouter)
router.use('/stats', statsRouter)
router.use('/settings', settingsRouter)
router.use('/categories', categoriesRouter)
router.use('/sellers', sellersRouter)
router.use('/audit-log', auditLogRouter)

export default router
