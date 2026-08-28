import { useEffect, useState } from 'react'
import { getSettings, updateSettings, type PlatformSettingsData } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function Settings() {
  const { token } = useAuth()
  const [current, setCurrent] = useState<PlatformSettingsData | null>(null)
  const [buyerPremiumInput, setBuyerPremiumInput] = useState('')
  const [commissionInput, setCommissionInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState<'buyerPremium' | 'commission' | null>(null)

  useEffect(() => {
    if (!token) return
    getSettings(token)
      .then((s) => {
        setCurrent(s)
        setBuyerPremiumInput(s.buyerPremiumPercent)
        setCommissionInput(s.sellerCommissionPercent)
      })
      .catch((err) => setError(err.message))
  }, [token])

  async function handleSaveBuyerPremium() {
    if (!token) return
    setSaving('buyerPremium')
    setError(null)
    setSaved(null)
    try {
      const result = await updateSettings({ buyerPremiumPercent: Number(buyerPremiumInput) }, token)
      setCurrent(result)
      setSaved(`Buyer premium updated to ${result.buyerPremiumPercent}%. New orders will use this rate.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  async function handleSaveCommission() {
    if (!token) return
    setSaving('commission')
    setError(null)
    setSaved(null)
    try {
      const result = await updateSettings({ sellerCommissionPercent: Number(commissionInput) }, token)
      setCurrent(result)
      setSaved(`Seller commission updated to ${result.sellerCommissionPercent}%. New payouts will use this rate.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-2 font-display text-3xl text-royal">Settings</h1>
      <p className="mb-8 text-sm text-gray-500">Platform-wide configuration.</p>

      {current === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="rounded-xl border border-royal/10 bg-white p-5">
            <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">Buyer Premium (%)</label>
            <p className="mb-3 text-[12.5px] text-gray-500">
              Percentage added to the winning bid to calculate each order's total. Currently{' '}
              <b className="text-royal">{current.buyerPremiumPercent}%</b>.
            </p>
            <div className="flex gap-2.5">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={buyerPremiumInput}
                onChange={(e) => setBuyerPremiumInput(e.target.value)}
                className="input w-32"
              />
              <button
                onClick={handleSaveBuyerPremium}
                disabled={saving !== null}
                className="rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
              >
                {saving === 'buyerPremium' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-royal/10 bg-white p-5">
            <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">Seller Commission (%)</label>
            <p className="mb-3 text-[12.5px] text-gray-500">
              Percentage deducted from the winning bid when calculating a seller's payout. Currently{' '}
              <b className="text-royal">{current.sellerCommissionPercent}%</b>.
            </p>
            <div className="flex gap-2.5">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commissionInput}
                onChange={(e) => setCommissionInput(e.target.value)}
                className="input w-32"
              />
              <button
                onClick={handleSaveCommission}
                disabled={saving !== null}
                className="rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
              >
                {saving === 'commission' ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {error && <p className="text-[12.5px] text-red">{error}</p>}
          {saved && <p className="text-[12.5px] text-green">{saved}</p>}
        </div>
      )}
    </div>
  )
}
