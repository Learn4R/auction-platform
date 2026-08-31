import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { getCategories, getMySellerApplication, type Category, type SellerStatus } from '../lib/api'
import { useAuth, type AuthUser } from '../lib/auth'
import { Emblem } from './Emblem'
import { NotificationBell } from './NotificationBell'

// Shared visual language for every top-level nav item — NavLinks and the
// Browse/Categories dropdown triggers alike — so the merged single row reads
// as one consistent set rather than link-styled-differently-from-button.
// Text runs a size smaller through the 768-899px zone specifically (that's
// the tightest fit: six-ish nav items plus the icon cluster in ~768px),
// stepping back up to the normal size from 900px, where there's room again.
function navLinkStyle(isActive: boolean) {
  return `relative py-1.5 text-[13px] min-[900px]:text-sm font-medium whitespace-nowrap transition-colors hover:text-royal after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:bg-gold after:transition-all after:duration-200 ${
    isActive ? 'text-royal after:w-full' : 'text-charcoal after:w-0 hover:after:w-full'
  }`
}

const primaryLinkClass = ({ isActive }: { isActive: boolean }) => navLinkStyle(isActive)

// How It Works is deliberately lighter-weight than the rest of the row —
// informational/support content, not a primary browsing action — but it
// still lives in the one row so it's never hidden behind a breakpoint gap.
const mutedLinkClass = ({ isActive }: { isActive: boolean }) =>
  `text-[12px] min-[900px]:text-[13px] font-medium whitespace-nowrap transition-colors hover:text-royal ${isActive ? 'text-royal' : 'text-gray-500'}`

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-3 w-3 flex-none transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function useOutsideClick(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])
  return ref
}

// Live Auctions stays its own top-level link (the one genuinely time-
// sensitive, high-frequency destination) — Upcoming and Archive fold in
// here alongside "All Auctions" since they're the same kind of thing (a
// status filter on the same underlying list) at lower urgency, rather than
// living in a separately-weighted row a click away from being noticed.
function BrowseDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClick(open, () => setOpen(false))
  const location = useLocation()
  const isActive = ['/browse', '/upcoming', '/archive'].includes(location.pathname)

  const items = [
    { to: '/browse', label: 'All Auctions' },
    { to: '/upcoming', label: 'Upcoming Auctions' },
    { to: '/archive', label: 'Archive' },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 ${navLinkStyle(isActive || open)}`}
        aria-expanded={open}
      >
        Browse
        <ChevronDown open={open} />
      </button>
      {open && (
        <div className="absolute left-0 z-50 mt-2.5 w-56 rounded-xl border border-royal/10 bg-white p-1.5 shadow-lg">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive: itemActive }) =>
                `block rounded-lg px-3 py-2 text-[13px] transition hover:bg-royal/5 ${itemActive ? 'text-royal font-semibold' : 'text-charcoal'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

function CategoriesDropdown() {
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState(false)
  const ref = useOutsideClick(open, () => setOpen(false))

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  // Past ~10 items a single column runs too tall to scan comfortably (and,
  // with no bound at all, taller than the viewport) — switch to a two-
  // column grid so it reads as two shorter lists instead of one long one.
  // max-h-[70vh] + overflow-y-auto is the safety net regardless of count:
  // whatever the category list grows to, the panel never overflows the
  // viewport or overlaps the page content below the header.
  const useGrid = categories.length > 10
  const rows = Math.ceil(categories.length / 2)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 ${navLinkStyle(open)}`}
        aria-expanded={open}
      >
        Categories
        <ChevronDown open={open} />
      </button>
      {open && (
        <div
          className={`absolute left-0 z-50 mt-2.5 max-h-[70vh] overflow-y-auto rounded-xl border border-royal/10 bg-white p-1.5 shadow-lg ${
            useGrid ? 'grid grid-flow-col gap-x-1 w-[26rem]' : 'flex w-64 flex-col'
          }`}
          style={useGrid ? { gridTemplateRows: `repeat(${rows}, minmax(0, auto))` } : undefined}
        >
          {categories.length === 0 ? (
            <div className="px-3 py-2.5 text-[13px] text-gray-400">Loading…</div>
          ) : (
            categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/browse?category=${cat.slug}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-[13px] text-charcoal transition hover:bg-royal/5"
              >
                {cat.name}
                <span className="font-mono text-[11px] text-gray-400">{cat.itemCount}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

function AccountMenu({
  user,
  sellLabel,
  showSellerDashboard,
  onLogout,
}: {
  user: AuthUser
  sellLabel: string | null
  showSellerDashboard: boolean
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useOutsideClick(open, () => setOpen(false))

  function close() {
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-royal text-[13px] font-semibold text-white transition hover:bg-deepblue"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {user.name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2.5 w-60 overflow-hidden rounded-xl border border-royal/10 bg-white shadow-lg">
          <div className="border-b border-royal/10 px-4 py-3">
            <div className="truncate text-[13px] font-semibold text-charcoal">{user.name}</div>
            <div className="font-mono text-[10px] tracking-wider text-gray-500 uppercase">{user.role}</div>
          </div>
          {sellLabel && (
            <div className="flex flex-col py-1.5 md:hidden">
              <Link to="/sell" onClick={close} className="px-4 py-2.5 text-[13.5px] font-medium text-charcoal transition hover:bg-royal/5">
                {sellLabel}
              </Link>
            </div>
          )}
          {/* Role-relevant destination first: an admin's one actually-used
              link shouldn't sit below two links they may never touch. */}
          <div className="flex flex-col py-1.5">
            {user.role === 'admin' && (
              <Link to="/admin" onClick={close} className="px-4 py-2.5 text-[13.5px] font-medium text-charcoal transition hover:bg-royal/5">
                Admin
              </Link>
            )}
            <Link to="/dashboard" onClick={close} className="px-4 py-2.5 text-[13.5px] font-medium text-charcoal transition hover:bg-royal/5">
              My Dashboard
            </Link>
            {showSellerDashboard && (
              <Link to="/my-listings" onClick={close} className="px-4 py-2.5 text-[13.5px] font-medium text-charcoal transition hover:bg-royal/5">
                Seller Dashboard
              </Link>
            )}
          </div>
          <div className="border-t border-royal/10 py-1.5">
            <button
              onClick={() => {
                close()
                onLogout()
              }}
              className="block w-full px-4 py-2.5 text-left text-[13.5px] font-medium text-gray-500 transition hover:bg-royal/5 hover:text-royal"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SearchToggle() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const navigate = useNavigate()
  const ref = useOutsideClick(open, () => setOpen(false))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim()) navigate(`/browse?search=${encodeURIComponent(value.trim())}`)
    setOpen(false)
    setValue('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-charcoal transition hover:bg-royal/5"
        aria-label="Search"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <form
          onSubmit={handleSubmit}
          className="absolute right-0 z-50 mt-2.5 w-[min(80vw,320px)] rounded-xl border border-royal/10 bg-white p-2 shadow-lg"
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Search lots by title…"
            className="input w-full text-[13.5px]"
          />
        </form>
      )}
    </div>
  )
}

function MobileLink({ to, end, onClick, children }: { to: string; end?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2.5 text-[15px] font-medium transition ${isActive ? 'bg-royal/5 text-royal' : 'text-charcoal hover:bg-royal/5'}`
      }
    >
      {children}
    </NavLink>
  )
}

function MobileGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 mb-1 px-3 font-mono text-[10.5px] font-semibold tracking-wider text-gray-400 uppercase first:mt-0">
      {children}
    </div>
  )
}

function MobileMenu({ user, sellLabel, onClose }: { user: AuthUser | null; sellLabel: string | null; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesOpen, setCategoriesOpen] = useState(false)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => {})
  }, [])

  return (
    <div className="max-h-[calc(100svh-68px)] overflow-y-auto border-t border-royal/10 bg-ivory md:hidden">
      <nav className="flex flex-col gap-0.5 px-4 py-4" aria-label="Mobile">
        <MobileGroupLabel>Browse</MobileGroupLabel>
        <MobileLink to="/" end onClick={onClose}>
          Home
        </MobileLink>
        <MobileLink to="/browse?status=live" onClick={onClose}>
          Live Auctions
        </MobileLink>
        <MobileLink to="/browse" end onClick={onClose}>
          Browse
        </MobileLink>
        <MobileLink to="/upcoming" onClick={onClose}>
          Upcoming Auctions
        </MobileLink>
        <MobileLink to="/archive" onClick={onClose}>
          Archive
        </MobileLink>
        <MobileLink to="/how-it-works" onClick={onClose}>
          How It Works
        </MobileLink>

        <button
          onClick={() => setCategoriesOpen((v) => !v)}
          className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] font-medium text-charcoal transition hover:bg-royal/5"
          aria-expanded={categoriesOpen}
        >
          Categories
          <ChevronDown open={categoriesOpen} />
        </button>
        {categoriesOpen && (
          <div className="mb-1 ml-3 flex flex-col gap-0.5 border-l border-royal/10 pl-3">
            {categories.map((cat) => (
              <NavLink
                key={cat.id}
                to={`/browse?category=${cat.slug}`}
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-[14px] text-gray-600 transition hover:bg-royal/5 hover:text-royal"
              >
                {cat.name}
              </NavLink>
            ))}
          </div>
        )}

        {user && sellLabel && (
          <>
            <MobileGroupLabel>Selling</MobileGroupLabel>
            <MobileLink to="/sell" onClick={onClose}>
              {sellLabel}
            </MobileLink>
          </>
        )}

        {!user && (
          <>
            <MobileGroupLabel>Account</MobileGroupLabel>
            <MobileLink to="/login" onClick={onClose}>
              Log In
            </MobileLink>
            <MobileLink to="/signup" onClick={onClose}>
              Sign Up
            </MobileLink>
          </>
        )}
      </nav>
    </div>
  )
}

export function Header() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  // null = "not yet checked" — distinct from both known states, so nothing
  // that depends on it (the nav label, the account-menu Seller Dashboard
  // entry) renders an answer before the real one is known. This is what
  // fixes the old flash: the previous version defaulted to `true` (i.e.
  // "approved") and corrected itself after the request resolved, which is
  // exactly backwards for anyone who *isn't* approved yet.
  const [sellerStatus, setSellerStatus] = useState<SellerStatus | null>(null)

  useEffect(() => {
    setSellerStatus(null)
    if (!user || !token) return
    getMySellerApplication(token)
      .then((res) => setSellerStatus(res.sellerStatus))
      .catch(() => {})
  }, [user, token])

  function handleLogout() {
    logout()
    navigate('/')
    setMobileOpen(false)
  }

  const sellLabel = sellerStatus === null ? null : sellerStatus === 'approved' ? 'Sell an Item' : 'Apply to Sell'
  const showSellerDashboard = sellerStatus !== null && sellerStatus !== 'none'

  return (
    <header className="sticky top-0 z-50 border-b border-royal/10 bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-3 px-4 min-[900px]:px-6">
        <div className="flex min-w-0 items-center gap-2 min-[900px]:gap-4 lg:gap-8">
          <NavLink to="/" className="flex flex-none items-center gap-2.5" onClick={() => setMobileOpen(false)}>
            <Emblem className="h-8 w-8" />
            <span className="hidden flex-col font-display text-lg leading-tight font-semibold text-royal sm:flex">
              Mudra House
              <small className="hidden font-mono text-[8.5px] font-normal tracking-widest text-gray-500 min-[900px]:block">
                FINE INDIAN AUCTIONS
              </small>
            </span>
          </NavLink>

          <nav className="hidden items-center gap-1.5 md:flex min-[900px]:gap-4 lg:gap-7" aria-label="Primary">
            <NavLink to="/" end className={primaryLinkClass}>
              Home
            </NavLink>
            <NavLink to="/browse?status=live" className={primaryLinkClass}>
              Live Auctions
            </NavLink>
            <BrowseDropdown />
            <CategoriesDropdown />
            <NavLink to="/how-it-works" className={mutedLinkClass}>
              How It Works
            </NavLink>
            {user && sellLabel && (
              <NavLink to="/sell" className={primaryLinkClass}>
                {sellLabel}
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex flex-none items-center gap-1 min-[900px]:gap-2">
          <SearchToggle />
          {user && <NotificationBell />}
          {user ? (
            <AccountMenu user={user} sellLabel={sellLabel} showSellerDashboard={showSellerDashboard} onLogout={handleLogout} />
          ) : (
            <div className="hidden items-center gap-3 sm:flex">
              <NavLink to="/login" className={primaryLinkClass}>
                Log In
              </NavLink>
              <NavLink
                to="/signup"
                className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white transition hover:bg-deepblue"
              >
                Sign Up
              </NavLink>
            </div>
          )}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-charcoal transition hover:bg-royal/5 md:hidden"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && <MobileMenu user={user} sellLabel={sellLabel} onClose={() => setMobileOpen(false)} />}
    </header>
  )
}
