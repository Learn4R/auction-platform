import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, submitItem, type Category } from '../lib/api'
import { useAuth } from '../lib/auth'

const emptyForm = {
  title: '',
  description: '',
  categoryId: '',
  year: '',
  material: '',
  condition: '',
  images: '',
  startingBid: '',
  bidIncrement: '',
  startTime: '',
  endTime: '',
}

export default function Sell() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null)

  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats)
        setForm((f) => (f.categoryId ? f : { ...f, categoryId: cats[0]?.id ?? '' }))
      })
      .catch(() => {})
  }, [])

  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setSubmitting(true)
    try {
      const item = await submitItem(
        {
          title: form.title,
          description: form.description,
          categoryId: form.categoryId,
          year: form.year ? Number(form.year) : null,
          material: form.material,
          condition: form.condition,
          images: form.images
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean),
          startingBid: Number(form.startingBid),
          bidIncrement: Number(form.bidIncrement),
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
        },
        token,
      )
      setSubmittedTitle(item.title)
      setForm({ ...emptyForm, categoryId: categories[0]?.id ?? '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">Sell an Item</h1>
      <p className="mb-8 text-sm text-gray-500">
        Submit a lot for review. Once approved by our team, it goes live for bidding with the auction settings you
        propose below.
      </p>

      {submittedTitle && (
        <div className="mb-6 rounded-lg border border-green/30 bg-green/10 p-4 text-sm text-green">
          <b>{submittedTitle}</b> was submitted and is now pending review.{' '}
          <Link to="/my-listings" className="font-semibold underline">
            View my listings →
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title">
          <input
            required
            name="title"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            required
            name="description"
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            className="input"
          />
        </Field>

        <Field label="Category">
          <select
            required
            name="categoryId"
            value={form.categoryId}
            onChange={(e) => update('categoryId', e.target.value)}
            className="input"
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Year">
            <input
              type="number"
              name="year"
              value={form.year}
              onChange={(e) => update('year', e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Material">
            <input name="material" value={form.material} onChange={(e) => update('material', e.target.value)} className="input" />
          </Field>
        </div>

        <Field label="Condition">
          <input name="condition" value={form.condition} onChange={(e) => update('condition', e.target.value)} className="input" />
        </Field>

        <Field label="Image URLs (comma-separated)">
          <input name="images" value={form.images} onChange={(e) => update('images', e.target.value)} className="input" />
        </Field>

        <div className="mt-2 border-t border-gray-100 pt-4">
          <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
            Proposed Auction Settings
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Starting Bid (₹)">
              <input
                type="number"
                required
                name="startingBid"
                min="1"
                value={form.startingBid}
                onChange={(e) => update('startingBid', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Bid Increment (₹)">
              <input
                type="number"
                required
                name="bidIncrement"
                min="1"
                value={form.bidIncrement}
                onChange={(e) => update('bidIncrement', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Start Time">
              <input
                type="datetime-local"
                required
                name="startTime"
                value={form.startTime}
                onChange={(e) => update('startTime', e.target.value)}
                className="input"
              />
            </Field>
            <Field label="End Time">
              <input
                type="datetime-local"
                required
                name="endTime"
                value={form.endTime}
                onChange={(e) => update('endTime', e.target.value)}
                className="input"
              />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-royal px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-charcoal">
      {label}
      {children}
    </label>
  )
}
