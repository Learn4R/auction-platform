import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useWatchlist } from '../lib/watchlist'

export function WatchlistButton({ itemId, className = '' }: { itemId: string; className?: string }) {
  const { user } = useAuth()
  const { isWatchlisted, toggle } = useWatchlist()
  const navigate = useNavigate()
  const active = user ? isWatchlisted(itemId) : false

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    void toggle(itemId)
  }

  return (
    <button
      onClick={handleClick}
      aria-label={active ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-pressed={active}
      className={`flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/90 shadow-[0_2px_8px_rgba(23,59,112,0.12)] transition hover:scale-105 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 transition-colors"
        fill={active ? '#C83B3B' : 'none'}
        stroke={active ? '#C83B3B' : '#173B70'}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 20.5s-7.5-4.6-9.8-9C.6 7.8 2.4 4.5 5.8 4c2-.3 3.8.6 4.9 2.2C11.8 4.6 13.6 3.7 15.6 4c3.4.5 5.2 3.8 3.6 7.5-2.3 4.4-9.8 9-9.8 9z" />
      </svg>
    </button>
  )
}
