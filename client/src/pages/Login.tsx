import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice ?? null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-2 font-display text-3xl text-royal">Log In</h1>
      <p className="mb-8 text-sm text-gray-500">Sign in to bid, sell items, or manage the marketplace.</p>

      {notice && (
        <p className="mb-6 rounded-lg border border-green/30 bg-green/10 px-3.5 py-2.5 text-[13.5px] text-green">
          {notice}
        </p>
      )}

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
          <span className="flex items-center justify-between">
            Password
            <Link to="/forgot-password" className="text-[12.5px] font-semibold text-royal hover:text-deepblue">
              Forgot password?
            </Link>
          </span>
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

      <p className="mt-6 text-center text-[13.5px] text-gray-500">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-royal hover:text-deepblue">
          Sign Up
        </Link>
      </p>
    </div>
  )
}
