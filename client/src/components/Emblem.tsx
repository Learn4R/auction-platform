export function Emblem({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="#173B70"
      strokeWidth="0.6"
    >
      <g opacity="0.5">
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse
            key={i}
            cx="100"
            cy="100"
            rx="86"
            ry="34"
            transform={`rotate(${i * 15} 100 100)`}
          />
        ))}
      </g>
      <circle cx="100" cy="100" r="58" fill="#FFFFFF" stroke="#C9A227" strokeWidth="1.1" />
      <circle cx="100" cy="100" r="52" fill="none" stroke="#DDBE63" strokeWidth="0.5" />
      {label && (
        <text
          x="100"
          y="106"
          textAnchor="middle"
          fontFamily="Newsreader"
          fontSize="15"
          fontWeight="500"
          fill="#173B70"
          stroke="none"
        >
          {label}
        </text>
      )}
    </svg>
  )
}
