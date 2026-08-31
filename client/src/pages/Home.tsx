import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ItemCard } from '../components/ItemCard'
import { getCategories, getItems, type Category, type ItemSummary } from '../lib/api'

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <div className="flex items-center gap-2.5 font-mono text-[11.5px] tracking-wider text-deepblue uppercase before:content-[''] before:inline-block before:h-px before:w-[22px] before:bg-gold">
          {eyebrow}
        </div>
        <h2 className="mt-1 font-display text-[clamp(26px,3.2vw,36px)] leading-tight text-royal">{title}</h2>
      </div>
      {action}
    </div>
  )
}

function Rail({ items }: { items: ItemSummary[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">Nothing here yet.</p>
  }
  return (
    <div className="flex gap-5 overflow-x-auto pb-2">
      {items.map((item) => (
        <div key={item.id} className="w-[290px] flex-none">
          <ItemCard item={item} />
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getItems(), getCategories()])
      .then(([itemsRes, categoriesRes]) => {
        setItems(itemsRes)
        setCategories(categoriesRes)
      })
      .catch((err) => setError(err.message))
  }, [])

  const live = items?.filter((i) => i.auction?.status === 'live') ?? []
  const upcoming = items?.filter((i) => i.auction?.status === 'upcoming') ?? []
  const featured = items?.filter((i) => i.auction?.status !== 'ended').slice(0, 4) ?? []

  return (
    <div>
      <section className="border-b border-royal/[0.07] bg-gradient-to-b from-[#FDFCFA] to-ivory py-16">
        <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="mb-5 flex items-center gap-2.5 font-mono text-[11.5px] tracking-wider text-deepblue uppercase before:content-[''] before:inline-block before:h-px before:w-[22px] before:bg-gold">
              TRUSTED INDIAN AUCTION HOUSE
            </div>
            <h1 className="mb-5 font-display text-[clamp(36px,4.6vw,56px)] leading-[1.06] text-royal">
              Discover History.
              <br />
              Own <em className="text-gold italic">Rarity</em>.
            </h1>
            <p className="mb-8 max-w-[480px] text-[17px] leading-relaxed text-gray-500">
              Bid on rare Indian currencies, historic coins, antiques and exceptional collectibles from trusted,
              verified sellers.
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Link
                to="/browse?status=live"
                className="inline-flex items-center justify-center rounded-lg bg-royal px-7 py-4 text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-deepblue hover:shadow-lg"
              >
                Explore Live Auctions
              </Link>
              <Link
                to="/browse"
                className="inline-flex items-center justify-center rounded-lg border-[1.4px] border-royal px-7 py-4 text-[15px] font-semibold text-royal transition hover:bg-royal hover:text-white"
              >
                Browse All Lots
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <svg viewBox="0 0 520 520" className="w-full max-w-[420px]" fill="none">
              <g opacity="0.16" stroke="#173B70" strokeWidth="0.7">
                {Array.from({ length: 20 }).map((_, i) => (
                  <ellipse
                    key={i}
                    cx="260"
                    cy="260"
                    rx="230"
                    ry="90"
                    transform={`rotate(${i * 9} 260 260)`}
                  />
                ))}
              </g>
              <circle cx="260" cy="260" r="150" fill="#FFFFFF" stroke="#C9A227" strokeWidth="1.2" />
              <circle cx="260" cy="260" r="138" fill="none" stroke="#DDBE63" strokeWidth="0.6" />
              <text x="260" y="230" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="13" letterSpacing="3" fill="#6B7280">
                MUDRA HOUSE
              </text>
              <text x="260" y="275" textAnchor="middle" fontFamily="Newsreader" fontSize="46" fontWeight="500" fill="#173B70">
                1901
              </text>
              <text x="260" y="304" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="11" letterSpacing="2" fill="#6B7280">
                ONE RUPEE · SILVER
              </text>
            </svg>
          </div>
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-[1240px] px-6 py-6 text-sm text-red">
          Couldn't load auction data: {error}
        </div>
      )}

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <SectionHead
          eyebrow="Curated Selection"
          title="Featured Lots"
          action={
            <Link to="/browse" className="text-sm font-semibold text-royal hover:text-deepblue">
              View All Auctions →
            </Link>
          }
        />
        {!items ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="border-y border-royal/[0.06] bg-white py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead
            eyebrow="Happening Now"
            title="Live Now"
            action={
              <Link to="/browse?status=live" className="text-sm font-semibold text-royal hover:text-deepblue">
                View All Live →
              </Link>
            }
          />
          {items && <Rail items={live} />}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-6 py-16">
        <SectionHead
          eyebrow="Mark Your Calendar"
          title="Upcoming Auctions"
          action={
            <Link to="/upcoming" className="text-sm font-semibold text-royal hover:text-deepblue">
              View All Upcoming →
            </Link>
          }
        />
        {items && <Rail items={upcoming} />}
      </section>

      <section className="border-y border-royal/[0.06] bg-white py-16">
        <div className="mx-auto max-w-[1240px] px-6">
          <SectionHead eyebrow="Browse by Interest" title="Categories" />
          {!categories ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/browse?category=${cat.slug}`}
                  className="flex items-center gap-4 rounded-xl border border-royal/10 bg-white p-5 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-[0_1px_2px_rgba(23,59,112,0.04),0_8px_24px_-12px_rgba(23,59,112,0.14)]"
                >
                  <div className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-gradient-to-br from-[#F6F0DE] to-[#EFE4C0]">
                    <span className="font-display text-lg text-[#8a6e18]">{cat.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-display text-[15px] leading-tight font-medium">{cat.name}</div>
                    <div className="mt-1 font-mono text-[10.5px] text-gray-500">
                      {cat.itemCount} lot{cat.itemCount === 1 ? '' : 's'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
