import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import type { RegisterableRole } from '../lib/api'

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<RegisterableRole>('buyer')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({ name, email, password, role })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-2 font-display text-3xl text-royal">Sign Up</h1>
      <p className="mb-8 text-sm text-gray-500">Create an account to bid, or sell items of your own.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Name
          <input
            required
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-royal/15 px-3.5 py-2.5 font-normal focus:border-royal focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-royal/15 px-3.5 py-2.5 font-normal focus:border-royal focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-royal/15 px-3.5 py-2.5 font-normal focus:border-royal focus:outline-none"
          />
          <span className="text-[11.5px] font-normal text-gray-500">At least 8 characters.</span>
        </label>

        <div>
          <div className="mb-2 text-[13px] font-semibold">I want to</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setRole('buyer')}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition ${
                role === 'buyer' ? 'border-royal bg-royal/5' : 'border-royal/15 hover:border-royal/40'
              }`}
            >
              <div className="text-[13.5px] font-semibold text-charcoal">Buy</div>
              <div className="text-[11.5px] text-gray-500">Bid on auctions</div>
            </button>
            <button
              type="button"
              onClick={() => setRole('seller')}
              className={`flex-1 rounded-lg border px-4 py-3 text-left transition ${
                role === 'seller' ? 'border-royal bg-royal/5' : 'border-royal/15 hover:border-royal/40'
              }`}
            >
              <div className="text-[13.5px] font-semibold text-charcoal">Sell</div>
              <div className="text-[11.5px] text-gray-500">List items for auction</div>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-royal px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-royal hover:text-deepblue">
          Log In
        </Link>
      </p>
    </div>
  )
}
