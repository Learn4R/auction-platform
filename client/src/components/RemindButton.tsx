import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useReminders } from '../lib/reminders'

export function RemindButton({ auctionId, className = '' }: { auctionId: string; className?: string }) {
  const { user } = useAuth()
  const { isReminded, toggle } = useReminders()
  const navigate = useNavigate()
  const active = user ? isReminded(auctionId) : false

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    void toggle(auctionId)
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={active}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition ${
        active ? 'bg-green/10 text-green' : 'bg-royal/5 text-royal hover:bg-royal/10'
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
        {active ? (
          <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {active ? 'Reminder Set' : 'Remind Me'}
    </button>
  )
}
