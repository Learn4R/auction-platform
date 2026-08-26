import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../../lib/api'
import { useAuth } from '../../lib/auth'

export default function Settings() {
  const { token } = useAuth()
  const [current, setCurrent] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) return
    getSettings(token)
      .then((s) => {
        setCurrent(s.buyerPremiumPercent)
        setInput(s.buyerPremiumPercent)
      })
      .catch((err) => setError(err.message))
  }, [token])

  async function handleSave() {
    if (!token) return
    setSaving(true)
    setError(null)
    setSaved(null)
    try {
      const result = await updateSettings(Number(input), token)
      setCurrent(result.buyerPremiumPercent)
      setSaved(`Buyer premium updated to ${result.buyerPremiumPercent}%. New orders will use this rate.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="mb-2 font-display text-3xl text-royal">Settings</h1>
      <p className="mb-8 text-sm text-gray-500">Platform-wide configuration.</p>

      {current === null ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-xl border border-royal/10 bg-white p-5">
          <label className="mb-1.5 block text-[13px] font-semibold text-charcoal">Buyer Premium (%)</label>
          <p className="mb-3 text-[12.5px] text-gray-500">
            Percentage added to the winning bid to calculate each order's total. Currently{' '}
            <b className="text-royal">{current}%</b>.
          </p>
          <div className="flex gap-2.5">
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="input w-32"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {error && <p className="mt-3 text-[12.5px] text-red">{error}</p>}
          {saved && <p className="mt-3 text-[12.5px] text-green">{saved}</p>}
        </div>
      )}
    </div>
  )
}
