import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LEGAL_PAGES } from '../lib/api'
import { useAuth } from '../lib/auth'
import { Emblem } from './Emblem'
import { NotificationBell } from './NotificationBell'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-1.5 text-sm font-medium transition-colors hover:text-royal after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:bg-gold after:transition-all after:duration-200 ${
    isActive ? 'text-royal after:w-full' : 'text-charcoal after:w-0 hover:after:w-full'
  }`

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-50 border-b border-royal/10 bg-ivory/90 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between gap-8 px-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <Emblem className="h-8 w-8" />
            <span className="flex flex-col font-display text-lg leading-tight font-semibold text-royal">
              Mudra House
              <small className="font-mono text-[8.5px] font-normal tracking-widest text-gray-500">
                FINE INDIAN AUCTIONS
              </small>
            </span>
          </NavLink>
          <nav className="flex flex-1 items-center gap-7" aria-label="Primary">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/browse" className={navLinkClass}>
              Browse
            </NavLink>
            <NavLink to="/upcoming" className={navLinkClass}>
              Upcoming
            </NavLink>
            <NavLink to="/archive" className={navLinkClass}>
              Archive
            </NavLink>
            {user && (
              <NavLink to="/dashboard" className={navLinkClass}>
                My Dashboard
              </NavLink>
            )}
            {(user?.role === 'seller' || user?.role === 'admin') && (
              <>
                <NavLink to="/sell" className={navLinkClass}>
                  Sell an Item
                </NavLink>
                <NavLink to="/my-listings" className={navLinkClass}>
                  My Listings
                </NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <NotificationBell />
                <span className="text-sm font-medium text-charcoal">{user.name}</span>
                <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-royal">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>
                  Log In
                </NavLink>
                <NavLink
                  to="/signup"
                  className="rounded-lg bg-royal px-4 py-2 text-sm font-semibold text-white transition hover:bg-deepblue"
                >
                  Sign Up
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-royal py-10 text-white/70">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-4 px-6 text-center text-xs">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Legal">
            {LEGAL_PAGES.map((page) => (
              <NavLink key={page.slug} to={`/legal/${page.slug}`} className="hover:text-white">
                {page.label}
              </NavLink>
            ))}
          </nav>
          <div>© 2026 Mudra House. Demo interface — not a live marketplace.</div>
        </div>
      </footer>
    </div>
  )
}
