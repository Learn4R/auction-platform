import { useEffect, useState, type FormEvent } from 'react'
import {
  createCategory,
  deleteCategory,
  getAdminCategories,
  updateCategory,
  type AdminCategory,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function Categories() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<AdminCategory[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  function load() {
    if (!token) return
    getAdminCategories(token)
      .then(setCategories)
      .catch((err) => setError(err.message))
  }

  useEffect(load, [token])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!token || !newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const cat = await createCategory({ name: newName.trim() }, token)
      setCategories((prev) => (prev ? [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)) : prev))
      setNewName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setCreating(false)
    }
  }

  function startEdit(cat: AdminCategory) {
    setEditingId(cat.id)
    setEditName(cat.name)
  }

  async function handleSaveEdit(id: string) {
    if (!token || !editName.trim()) return
    setBusyId(id)
    setError(null)
    try {
      const updated = await updateCategory(id, { name: editName.trim() }, token)
      setCategories((prev) => (prev ? prev.map((c) => (c.id === id ? updated : c)) : prev))
      setEditingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(cat: AdminCategory) {
    if (!token) return
    if (!window.confirm(`Delete "${cat.name}"? This can't be undone.`)) return
    setBusyId(cat.id)
    setError(null)
    try {
      await deleteCategory(cat.id, token)
      setCategories((prev) => (prev ? prev.filter((c) => c.id !== cat.id) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 font-display text-3xl text-royal">Categories</h1>
      <p className="mb-8 text-sm text-gray-500">Manage the categories items can be listed under.</p>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2.5">
        <input
          placeholder="New category name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {creating ? 'Adding…' : '+ Add'}
        </button>
      </form>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!categories ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-royal/10 bg-white">
          {categories.map((cat, i) => (
            <div
              key={cat.id}
              className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}
            >
              {editingId === cat.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input flex-1 text-[13.5px]"
                  autoFocus
                />
              ) : (
                <div>
                  <div className="font-medium text-charcoal">{cat.name}</div>
                  <div className="font-mono text-[11px] text-gray-500">
                    {cat.slug} · {cat.itemCount} item{cat.itemCount === 1 ? '' : 's'}
                  </div>
                </div>
              )}

              <div className="flex flex-shrink-0 gap-2">
                {editingId === cat.id ? (
                  <>
                    <button
                      onClick={() => handleSaveEdit(cat.id)}
                      disabled={busyId === cat.id}
                      className="rounded-lg bg-royal px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-royal/20 px-3 py-1.5 text-[12.5px] font-semibold text-charcoal hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEdit(cat)}
                      className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-royal hover:bg-royal/5 hover:text-deepblue"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      disabled={busyId === cat.id}
                      className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-red hover:bg-red/5 hover:text-red/70 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">No categories yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
