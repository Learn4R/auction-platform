import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'admin' ? '/admin' : user.role === 'seller' ? '/my-listings' : '/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-2 font-display text-3xl text-royal">Log In</h1>
      <p className="mb-8 text-sm text-gray-500">Sign in to sell items or manage the approval queue.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-royal/15 px-3.5 py-2.5 font-normal focus:border-royal focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-royal px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {submitting ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </div>
  )
}
