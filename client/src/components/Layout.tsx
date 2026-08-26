import { NavLink, Outlet } from 'react-router-dom'
import { Emblem } from './Emblem'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-1.5 text-sm font-medium transition-colors hover:text-royal after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:bg-gold after:transition-all after:duration-200 ${
    isActive ? 'text-royal after:w-full' : 'text-charcoal after:w-0 hover:after:w-full'
  }`

export function Layout() {
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
          <nav className="flex items-center gap-7" aria-label="Primary">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/browse" className={navLinkClass}>
              Browse
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-royal py-10 text-white/70">
        <div className="mx-auto max-w-[1240px] px-6 text-center text-xs">
          © 2026 Mudra House. Demo interface — not a live marketplace.
        </div>
      </footer>
    </div>
  )
}
