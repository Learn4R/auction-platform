import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request a password reset')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="mb-2 font-display text-3xl text-royal">Check Your Email</h1>
        <p className="text-sm text-gray-500">
          If an account exists for <span className="font-semibold text-charcoal">{email}</span>, we've sent a link to
          reset your password. It'll expire in an hour.
        </p>
        <Link to="/login" className="mt-6 inline-block text-[13.5px] font-semibold text-royal hover:text-deepblue">
          ← Back to Log In
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-2 font-display text-3xl text-royal">Forgot Password</h1>
      <p className="mb-8 text-sm text-gray-500">
        Enter the email on your account and we'll send you a link to reset your password.
      </p>

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

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-royal px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-6 text-center text-[13.5px] text-gray-500">
        <Link to="/login" className="font-semibold text-royal hover:text-deepblue">
          ← Back to Log In
        </Link>
      </p>
    </div>
  )
}
