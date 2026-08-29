import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      navigate('/login', { state: { notice: 'Your password has been reset. Log in with your new password.' } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <h1 className="mb-2 font-display text-3xl text-royal">Reset Password</h1>
        <p className="text-sm text-red">
          This reset link is missing its token. Please request a new one from the{' '}
          <Link to="/forgot-password" className="font-semibold text-royal hover:text-deepblue">
            forgot password
          </Link>{' '}
          page.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <h1 className="mb-2 font-display text-3xl text-royal">Reset Password</h1>
      <p className="mb-8 text-sm text-gray-500">Enter a new password for your account.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          New Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-royal/15 px-3.5 py-2.5 font-normal focus:border-royal focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Confirm New Password
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="rounded-lg border border-royal/15 px-3.5 py-2.5 font-normal focus:border-royal focus:outline-none"
          />
        </label>

        {error && <p className="text-sm text-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-royal px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-deepblue disabled:opacity-50"
        >
          {submitting ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
