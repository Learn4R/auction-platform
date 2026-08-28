function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={filled ? '#C9A227' : 'none'} stroke="#C9A227" strokeWidth="1.5">
      <path
        d="M12 2.5l2.9 6.6 7.1.7-5.4 4.8 1.6 7-6.2-3.7-6.2 3.7 1.6-7-5.4-4.8 7.1-.7z"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StarRatingDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= Math.round(rating)} size={size} />
      ))}
    </span>
  )
}

export function StarRatingInput({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <span className="inline-flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="transition hover:scale-110"
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
        >
          <Star filled={n <= value} size={24} />
        </button>
      ))}
    </span>
  )
}
