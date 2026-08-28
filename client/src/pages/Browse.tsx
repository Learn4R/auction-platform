import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ItemCard } from '../components/ItemCard'
import { getCategories, getItems, type AuctionStatus, type Category, type ItemSummary } from '../lib/api'

type SortKey = 'recommended' | 'ending' | 'newest' | 'low' | 'high'

const STATUS_OPTIONS: { value: AuctionStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'live', label: 'Live' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended', label: 'Ended' },
]

function sortItems(items: ItemSummary[], sort: SortKey) {
  const withBid = (item: ItemSummary) => Number(item.auction?.currentBid ?? item.auction?.startingBid ?? 0)

  const sorted = [...items]
  switch (sort) {
    case 'ending':
      return sorted.sort((a, b) => {
        const aTime = a.auction ? new Date(a.auction.endTime).getTime() : Infinity
        const bTime = b.auction ? new Date(b.auction.endTime).getTime() : Infinity
        return aTime - bTime
      })
    case 'low':
      return sorted.sort((a, b) => withBid(a) - withBid(b))
    case 'high':
      return sorted.sort((a, b) => withBid(b) - withBid(a))
    case 'newest':
      return sorted.sort((a, b) => {
        const aTime = a.auction ? new Date(a.auction.startTime).getTime() : 0
        const bTime = b.auction ? new Date(b.auction.startTime).getTime() : 0
        return bTime - aTime
      })
    default:
      return sorted
  }
}

interface FilterPanelProps {
  status: AuctionStatus | 'all'
  category: string | null
  categories: Category[]
  onStatus: (value: string) => void
  onCategory: (value: string | null) => void
}

function FilterPanel({ status, category, categories, onStatus, onCategory }: FilterPanelProps) {
  return (
    <>
      <div className="border-b border-gray-100 pb-[18px]">
        <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">Status</div>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatus(opt.value)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                status === opt.value ? 'border-royal bg-royal text-white' : 'border-royal/15 text-charcoal hover:border-royal'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-gray-100 py-[18px]">
        <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">Category</div>
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px] sm:py-1">
            <input type="radio" name="category" checked={!category} onChange={() => onCategory(null)} className="accent-royal" />
            All categories
          </label>
          {categories.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-[13.5px] sm:py-1">
              <input
                type="radio"
                name="category"
                checked={category === cat.slug}
                onChange={() => onCategory(cat.slug)}
                className="accent-royal"
              />
              {cat.name}
              <span className="ml-auto font-mono text-[11px] text-gray-400">{cat.itemCount}</span>
            </label>
          ))}
        </div>
      </div>
    </>
  )
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams()
  const status = (searchParams.get('status') as AuctionStatus | null) ?? 'all'
  const category = searchParams.get('category')
  const sort = (searchParams.get('sort') as SortKey | null) ?? 'recommended'
  const search = searchParams.get('search') ?? ''

  const [items, setItems] = useState<ItemSummary[] | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [error, setError] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setItems(null)
    getItems({
      status: status === 'all' ? undefined : status,
      category: category ?? undefined,
    })
      .then(setItems)
      .catch((err) => setError(err.message))
  }, [status, category])

  const searchedItems = useMemo(() => {
    if (!items) return []
    if (!search.trim()) return items
    const q = search.trim().toLowerCase()
    return items.filter((item) => item.title.toLowerCase().includes(q))
  }, [items, search])

  const sortedItems = useMemo(() => sortItems(searchedItems, sort), [searchedItems, sort])

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  const activeFilterCount = (status !== 'all' ? 1 : 0) + (category ? 1 : 0)

  return (
    <div>
      <div className="border-b border-royal/[0.07] bg-white py-9">
        <div className="mx-auto max-w-[1240px] px-6">
          <h1 className="font-display text-[clamp(26px,3.2vw,36px)] text-royal">All Auctions</h1>
          <p className="mt-2 max-w-[560px] text-[15.5px] text-gray-500">
            Search and filter live, upcoming and completed lots across every category.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-9 px-6 py-9 md:grid-cols-[260px_1fr]">
        {/* Mobile filter trigger */}
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg border border-royal/15 bg-white px-4 py-3 text-[13.5px] font-semibold text-charcoal md:hidden"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-royal px-1 font-mono text-[11px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop sidebar */}
        <aside className="sticky top-24 hidden rounded-xl border border-royal/10 bg-white p-5 md:block">
          <FilterPanel
            status={status}
            category={category}
            categories={categories}
            onStatus={(v) => updateParam('status', v)}
            onCategory={(v) => updateParam('category', v)}
          />
          {(status !== 'all' || category) && (
            <button onClick={() => setSearchParams({})} className="pt-4 text-[12.5px] font-semibold text-gray-500 hover:text-red">
              Clear all filters
            </button>
          )}
        </aside>

        {/* Mobile filter drawer */}
        {filtersOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div className="absolute inset-0 bg-charcoal/40" onClick={() => setFiltersOpen(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col overflow-y-auto bg-white p-5 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg text-royal">Filters</h3>
                <button
                  onClick={() => setFiltersOpen(false)}
                  aria-label="Close filters"
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-royal/5"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <FilterPanel
                status={status}
                category={category}
                categories={categories}
                onStatus={(v) => updateParam('status', v)}
                onCategory={(v) => updateParam('category', v)}
              />
              <div className="mt-5 flex gap-2.5">
                {(status !== 'all' || category) && (
                  <button
                    onClick={() => setSearchParams({})}
                    className="flex-1 rounded-lg border border-royal/20 py-3 text-[13.5px] font-semibold text-charcoal"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setFiltersOpen(false)}
                  className="flex-1 rounded-lg bg-royal py-3 text-[13.5px] font-semibold text-white"
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[13.5px] text-gray-500">
              {items && (
                <>
                  <b className="text-charcoal">{sortedItems.length}</b> lot{sortedItems.length === 1 ? '' : 's'} found
                  {search && (
                    <>
                      {' '}
                      for "<span className="text-charcoal">{search}</span>"{' '}
                      <button onClick={() => updateParam('search', null)} className="font-semibold text-royal hover:underline">
                        Clear
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="rounded-lg border border-royal/15 bg-white px-3.5 py-2 text-[13px]"
            >
              <option value="recommended">Recommended</option>
              <option value="ending">Ending Soon</option>
              <option value="newest">Newest</option>
              <option value="low">Lowest Bid</option>
              <option value="high">Highest Bid</option>
            </select>
          </div>

          {error && <p className="text-sm text-red">Couldn't load items: {error}</p>}

          {!items ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : sortedItems.length === 0 ? (
            <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
              <h4 className="mb-2 font-display text-lg text-royal">No lots match your filters</h4>
              <p className="text-sm">Try clearing a filter or checking back later.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {sortedItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
