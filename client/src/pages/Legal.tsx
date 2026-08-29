import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { LegalContent } from '../components/LegalContent'
import { getLegalPage, type LegalPage } from '../lib/api'
import { formatDateTime } from '../lib/format'

export default function Legal() {
  const { slug } = useParams<{ slug: string }>()
  const [page, setPage] = useState<LegalPage | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    setPage(null)
    setError(null)
    getLegalPage(slug)
      .then(setPage)
      .catch((err) => setError(err.message))
  }, [slug])

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="mb-3 font-display text-2xl text-royal">Page not found</h1>
        <p className="mb-6 text-sm text-gray-500">{error}</p>
        <Link to="/" className="text-sm font-semibold text-royal hover:text-deepblue">
          ← Back to Home
        </Link>
      </div>
    )
  }

  if (!page) {
    return <div className="mx-auto max-w-3xl px-6 py-20 text-sm text-gray-500">Loading…</div>
  }

  return (
    <div className="mx-auto max-w-prose px-6 py-14">
      <h1 className="mb-1.5 font-display text-3xl text-royal">{page.title}</h1>
      <p className="mb-9 font-mono text-[11px] text-gray-500">Last updated {formatDateTime(page.updatedAt)}</p>
      <LegalContent content={page.content} />
    </div>
  )
}
