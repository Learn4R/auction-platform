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
        <div className="overflow-x-auto rounded-xl border border-royal/10 bg-white">
          <table className="w-full text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 font-mono text-[10.5px] tracking-wider text-gray-500 uppercase">
                <th className="px-5 py-3">Seller</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller) => (
                <tr key={seller.id} className="border-b border-gray-100 last:border-b-0">
                  <td className="px-5 py-3.5 font-medium text-charcoal">{seller.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{seller.email}</td>
                  <td className="px-5 py-3.5 font-mono text-gray-500">{seller.itemCount}</td>
                  <td className="px-5 py-3.5 font-mono text-[11.5px] text-gray-500">
                    {formatDateTime(seller.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${
                        seller.verified ? 'bg-green/10 text-green' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {seller.verified ? 'Verified' : 'Unverified'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleToggle(seller.id)}
                      disabled={busyId === seller.id}
                      className="text-[12.5px] font-semibold text-royal hover:text-deepblue disabled:opacity-50"
                    >
                      {seller.verified ? 'Unverify' : 'Verify'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
