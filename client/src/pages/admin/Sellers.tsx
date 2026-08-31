import { useEffect, useState } from 'react'
import { getAdminSellers, toggleSellerVerification, type AdminSeller } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime } from '../../lib/format'

export default function Sellers() {
  const { token } = useAuth()
  const [sellers, setSellers] = useState<AdminSeller[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getAdminSellers(token)
      .then(setSellers)
      .catch((err) => setError(err.message))
  }, [token])

  async function handleToggle(id: string) {
    if (!token) return
    setBusyId(id)
    setError(null)
    try {
      const updated = await toggleSellerVerification(id, token)
      setSellers((prev) => (prev ? prev.map((s) => (s.id === id ? updated : s)) : prev))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update seller')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Sellers</h1>
      <p className="mb-8 text-sm text-gray-500">Verified sellers get a trust badge shown to buyers.</p>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!sellers ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : sellers.length === 0 ? (
        <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
          <h4 className="mb-2 font-display text-lg text-royal">No sellers yet</h4>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {sellers.map((seller) => (
            <div key={seller.id} className="rounded-xl border border-royal/10 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-charcoal">{seller.name}</h3>
                  <div className="mt-1 font-mono text-[11px] text-gray-500">
                    {seller.email} · joined {formatDateTime(seller.createdAt)}
                  </div>
                </div>
                <span
                  className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${
                    seller.verified ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {seller.verified ? 'Verified' : 'Unverified'}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <span className="font-mono text-[12px] text-gray-500">
                  Items listed: <b className="text-charcoal">{seller.itemCount}</b>
                </span>
                <button
                  onClick={() => handleToggle(seller.id)}
                  disabled={busyId === seller.id}
                  className="rounded-lg border border-royal/20 px-4 py-2 text-[13px] font-semibold text-royal transition hover:bg-royal/5 hover:text-deepblue disabled:opacity-50"
                >
                  {seller.verified ? 'Unverify' : 'Verify'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
