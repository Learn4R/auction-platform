import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'
import { logAdminAction } from '../../lib/auditLog.js'

const router = Router()

router.patch<{ slug: string }>('/:slug', authenticate('admin'), async (req, res) => {
  const { title, content } = req.body ?? {}

  const existing = await prisma.legalPage.findUnique({ where: { slug: req.params.slug } })
  if (!existing) {
    res.status(404).json({ error: 'legal page not found' })
    return
  }

  if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
    res.status(400).json({ error: 'title must be a non-empty string' })
    return
  }
  if (content !== undefined && (typeof content !== 'string' || !content.trim())) {
    res.status(400).json({ error: 'content must be a non-empty string' })
    return
  }
  if (title === undefined && content === undefined) {
    res.status(400).json({ error: 'title or content is required' })
    return
  }

  const updated = await prisma.legalPage.update({
    where: { slug: existing.slug },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
    },
  })

  await logAdminAction(req.user!.id, 'update_legal_page', updated.title)

  res.json(updated)
})

export default router
