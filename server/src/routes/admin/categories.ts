import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { authenticate } from '../../middleware/auth.js'

const router = Router()

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

router.get('/', authenticate('admin'), async (_req, res) => {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, _count: { select: { items: true } } },
    orderBy: { name: 'asc' },
  })

  res.json(categories.map(({ _count, ...c }) => ({ ...c, itemCount: _count.items })))
})

router.post('/', authenticate('admin'), async (req, res) => {
  const { name, slug } = req.body ?? {}

  if (typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required' })
    return
  }

  const finalSlug = typeof slug === 'string' && slug.trim() ? slugify(slug) : slugify(name)
  if (!finalSlug) {
    res.status(400).json({ error: 'could not derive a valid slug' })
    return
  }

  const existing = await prisma.category.findUnique({ where: { slug: finalSlug } })
  if (existing) {
    res.status(409).json({ error: 'a category with this slug already exists' })
    return
  }

  const category = await prisma.category.create({ data: { name: name.trim(), slug: finalSlug } })
  res.status(201).json(category)
})

router.patch<{ id: string }>('/:id', authenticate('admin'), async (req, res) => {
  const { name, slug } = req.body ?? {}

  const category = await prisma.category.findUnique({ where: { id: req.params.id } })
  if (!category) {
    res.status(404).json({ error: 'category not found' })
    return
  }

  const data: { name?: string; slug?: string } = {}

  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ error: 'name must be a non-empty string' })
      return
    }
    data.name = name.trim()
  }

  if (slug !== undefined) {
    const finalSlug = slugify(String(slug))
    if (!finalSlug) {
      res.status(400).json({ error: 'could not derive a valid slug' })
      return
    }
    const existing = await prisma.category.findUnique({ where: { slug: finalSlug } })
    if (existing && existing.id !== category.id) {
      res.status(409).json({ error: 'a category with this slug already exists' })
      return
    }
    data.slug = finalSlug
  }

  const updated = await prisma.category.update({ where: { id: category.id }, data })
  res.json(updated)
})

router.delete<{ id: string }>('/:id', authenticate('admin'), async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    select: { id: true, _count: { select: { items: true } } },
  })
  if (!category) {
    res.status(404).json({ error: 'category not found' })
    return
  }
  if (category._count.items > 0) {
    res.status(409).json({ error: `cannot delete: ${category._count.items} item(s) still use this category` })
    return
  }

  await prisma.category.delete({ where: { id: category.id } })
  res.status(204).send()
})

export default router
