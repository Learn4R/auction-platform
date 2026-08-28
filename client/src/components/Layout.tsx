import { NavLink, Outlet } from 'react-router-dom'
import { LEGAL_PAGES } from '../lib/api'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />

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
