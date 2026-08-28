import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LEGAL_PAGES, getLegalPage, updateLegalPage, type LegalPage } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime } from '../../lib/format'

export default function Legal() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const { slug: routeSlug } = useParams<{ slug: string }>()
  const slug = routeSlug ?? LEGAL_PAGES[0].slug

  const [page, setPage] = useState<LegalPage | null>(null)
  const [titleInput, setTitleInput] = useState('')
  const [contentInput, setContentInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setPage(null)
    setError(null)
    setSaved(null)
    getLegalPage(slug)
      .then((p) => {
        setPage(p)
        setTitleInput(p.title)
        setContentInput(p.content)
      })
      .catch((err) => setError(err.message))
  }, [slug])

  async function handleSave() {
    if (!token) return
    setSaving(true)
    setError(null)
    setSaved(null)
    try {
      const updated = await updateLegalPage(slug, { title: titleInput, content: contentInput }, token)
      setPage(updated)
      setSaved(`Saved. Live on the public page as of ${formatDateTime(updated.updatedAt)}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Legal Pages</h1>
      <p className="mb-6 text-sm text-gray-500">Edit the content shown on each public legal page.</p>

      <div className="mb-6 flex flex-wrap gap-2">
        {LEGAL_PAGES.map((p) => (
          <button
            key={p.slug}
            onClick={() => navigate(`/admin/legal/${p.slug}`)}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition ${
              p.slug === slug ? 'bg-royal text-white' : 'bg-white text-charcoal hover:bg-royal/5'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-lg border border-gold/40 bg-gold/5 p-4 text-[12.5px] leading-relaxed text-[#8a6e18]">
        <b>Draft template — not certified legal advice.</b> The seeded content for these pages is a reasonable
        starting point covering the topics buyers and sellers typically expect, but it has not been reviewed by a
        lawyer. Have it checked against applicable law before relying on it for a live marketplace.
      </div>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!page ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-royal/10 bg-white p-5">
          <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">Title</label>
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="input mb-4 w-full"
          />

          <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">
            Content
            <span className="ml-2 font-normal text-gray-500">
              (use "## " for a section heading and "- " for bullet list lines; separate paragraphs with a blank line)
            </span>
          </label>
          <textarea
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            rows={20}
            className="input w-full font-mono text-[12.5px] leading-relaxed"
          />

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !titleInput.trim() || !contentInput.trim()}
              className="rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <span className="font-mono text-[11px] text-gray-500">
              Last updated {formatDateTime(page.updatedAt)}
            </span>
          </div>
          {saved && <p className="mt-3 text-[12.5px] text-green">{saved}</p>}
        </div>
      )}
    </div>
  )
}
