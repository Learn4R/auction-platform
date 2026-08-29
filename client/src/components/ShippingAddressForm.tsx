import { useState } from 'react'
import { saveShippingAddress, type MyProfile, type Order } from '../lib/api'
import { useAuth } from '../lib/auth'

export function ShippingAddressForm({
  order,
  defaultAddress,
  onSaved,
}: {
  order: Order
  defaultAddress: MyProfile | null
  onSaved: (order: Order) => void
}) {
  const { token } = useAuth()
  const [name, setName] = useState(defaultAddress?.defaultShippingName ?? '')
  const [phone, setPhone] = useState(defaultAddress?.defaultShippingPhone ?? '')
  const [addressLine1, setAddressLine1] = useState(defaultAddress?.defaultShippingAddressLine1 ?? '')
  const [addressLine2, setAddressLine2] = useState(defaultAddress?.defaultShippingAddressLine2 ?? '')
  const [city, setCity] = useState(defaultAddress?.defaultShippingCity ?? '')
  const [state, setState] = useState(defaultAddress?.defaultShippingState ?? '')
  const [pincode, setPincode] = useState(defaultAddress?.defaultShippingPincode ?? '')
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const updated = await saveShippingAddress(
        order.id,
        { name, phone, addressLine1, addressLine2: addressLine2 || undefined, city, state, pincode, saveAsDefault },
        token,
      )
      onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save shipping address')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 border-t border-gray-100 pt-4">
      <div className="mb-1 font-mono text-[10px] tracking-wider text-gray-500 uppercase">
        Shipping Address Required
      </div>
      <p className="mb-3 text-[12.5px] text-gray-500">Add where this lot should ship before you can pay.</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <input
          className="input text-[13.5px]"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          className="input text-[13.5px]"
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
        <input
          className="input text-[13.5px] sm:col-span-2"
          placeholder="Address line 1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          required
        />
        <input
          className="input text-[13.5px] sm:col-span-2"
          placeholder="Address line 2 (optional)"
          value={addressLine2}
          onChange={(e) => setAddressLine2(e.target.value)}
        />
        <input className="input text-[13.5px]" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
        <input
          className="input text-[13.5px]"
          placeholder="State"
          value={state}
          onChange={(e) => setState(e.target.value)}
          required
        />
        <input
          className="input text-[13.5px]"
          placeholder="PIN code"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          maxLength={6}
          inputMode="numeric"
          required
        />
      </div>
      <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-charcoal">
        <input
          type="checkbox"
          checked={saveAsDefault}
          onChange={(e) => setSaveAsDefault(e.target.checked)}
          className="accent-royal"
        />
        Save as my default address
      </label>
      {error && <p className="mt-2.5 text-[12.5px] text-red">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-lg bg-royal px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save Shipping Address'}
      </button>
    </form>
  )
}
