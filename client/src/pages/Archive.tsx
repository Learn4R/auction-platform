import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Emblem } from '../components/Emblem'
import { getArchive, getCategories, type ArchiveEntry, type ArchiveSort, type Category } from '../lib/api'
import { formatCurrency, formatDateTime } from '../lib/format'

function ArchiveCard({ entry }: { entry: ArchiveEntry }) {
  return (
    <Link
      to={`/items/${entry.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-royal/10 bg-white transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-[0_4px_8px_rgba(23,59,112,0.05),0_20px_40px_-16px_rgba(23,59,112,0.20)]"
    >
      <div className="relative flex aspect-[1.15/1] items-center justify-center overflow-hidden bg-gradient-to-br from-[#F6F3EC] to-ivory">
        <Emblem className="h-2/3 w-2/3" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-gray-500 uppercase">
            Sold
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <div className="font-mono text-[10px] tracking-wider text-deepblue uppercase">{entry.category.name}</div>
        <h3 className="font-display text-[16.5px] leading-snug font-medium text-charcoal">{entry.title}</h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="font-mono text-[9.5px] tracking-wider text-gray-500 uppercase">Hammer Price</div>
            <div className="font-mono text-[17px] font-semibold text-royal">{formatCurrency(entry.hammerPrice)}</div>
          </div>
          <div className="font-mono text-[11px] text-gray-500">{formatDateTime(entry.endedAt)}</div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 text-[11.5px] text-gray-500">
          <span>{entry.seller.name}</span>
          <span className="font-mono">{entry.bidsCount} bids</span>
        </div>
      </div>
    </Link>
  )
}

export default function Archive() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category')
  const minPrice = searchParams.get('minPrice') ?? ''
  const maxPrice = searchParams.get('maxPrice') ?? ''
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const sort = (searchParams.get('sort') as ArchiveSort | null) ?? 'recent'

  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '')
  const [categories, setCategories] = useState<Category[]>([])
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  // Debounce the search box so we don't fire a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      const search = searchParams.get('search') ?? ''
      if (searchInput !== search) updateParam('search', searchInput || null)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const search = searchParams.get('search')

  useEffect(() => {
    setEntries(null)
    getArchive({
      category: category ?? undefined,
      search: search ?? undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sort,
    })
      .then(setEntries)
      .catch((err) => setError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search, minPrice, maxPrice, dateFrom, dateTo, sort])

  function updateParam(key: string, value: string | null) {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }

  const hasFilters = category || search || minPrice || maxPrice || dateFrom || dateTo

  return (
    <div>
      <div className="border-b border-royal/[0.07] bg-white py-9">
        <div className="mx-auto max-w-[1240px] px-6">
          <h1 className="font-display text-[clamp(26px,3.2vw,36px)] text-royal">Auction Archive</h1>
          <p className="mt-2 max-w-[560px] text-[15.5px] text-gray-500">
            A public record of past results — final prices from every lot we've sold. No account needed.
          </p>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1240px] grid-cols-1 items-start gap-9 px-6 py-9 md:grid-cols-[260px_1fr]">
        <aside className="sticky top-24 rounded-xl border border-royal/10 bg-white p-5">
          <div className="border-b border-gray-100 pb-[18px]">
            <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
              Search
            </div>
            <input
              placeholder="Item title…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input w-full text-[13.5px]"
            />
          </div>

          <div className="border-b border-gray-100 py-[18px]">
            <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
              Category
            </div>
            <div className="flex flex-col gap-1">
              <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[13.5px]">
                <input
                  type="radio"
                  name="archive-category"
                  checked={!category}
                  onChange={() => updateParam('category', null)}
                  className="accent-royal"
                />
                All categories
              </label>
              {categories.map((cat) => (
                <label key={cat.id} className="flex cursor-pointer items-center gap-2.5 py-1 text-[13.5px]">
                  <input
                    type="radio"
                    name="archive-category"
                    checked={category === cat.slug}
                    onChange={() => updateParam('category', cat.slug)}
                    className="accent-royal"
                  />
                  {cat.name}
                </label>
              ))}
            </div>
          </div>

          <div className="border-b border-gray-100 py-[18px]">
            <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
              Price Range (₹)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam('minPrice', e.target.value || null)}
                className="input w-full text-[13px]"
              />
              <span className="text-gray-400">–</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value || null)}
                className="input w-full text-[13px]"
              />
            </div>
          </div>

          <div className="py-[18px]">
            <div className="mb-3 font-mono text-[10.5px] font-semibold tracking-wider text-royal uppercase">
              Sale Date
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => updateParam('dateFrom', e.target.value || null)}
                className="input w-full text-[13px]"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => updateParam('dateTo', e.target.value || null)}
                className="input w-full text-[13px]"
              />
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={() => {
                setSearchInput('')
                setSearchParams({})
              }}
              className="pt-2 text-[12.5px] font-semibold text-gray-500 hover:text-red"
            >
              Clear all filters
            </button>
          )}
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[13.5px] text-gray-500">
              {entries && (
                <>
                  <b className="text-charcoal">{entries.length}</b> result{entries.length === 1 ? '' : 's'}
                </>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="rounded-lg border border-royal/15 bg-white px-3.5 py-2 text-[13px]"
            >
              <option value="recent">Most Recent</option>
              <option value="priceHigh">Highest Price</option>
              <option value="priceLow">Lowest Price</option>
            </select>
          </div>

          {error && <p className="text-sm text-red">Couldn't load the archive: {error}</p>}

          {!entries ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : entries.length === 0 ? (
            <div className="rounded-xl border border-royal/10 bg-white py-16 text-center text-gray-500">
              <h4 className="mb-2 font-display text-lg text-royal">No results match your filters</h4>
              <p className="text-sm">Try widening your search or clearing a filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => (
                <ArchiveCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
