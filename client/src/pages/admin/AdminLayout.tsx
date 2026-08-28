import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/approvals', label: 'Item Approvals' },
  { to: '/admin/seller-applications', label: 'Seller Applications' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/payouts', label: 'Payouts Ledger' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/sellers', label: 'Sellers' },
  { to: '/admin/settings', label: 'Settings' },
  { to: '/admin/audit-log', label: 'Audit Log' },
  { to: '/admin/legal', label: 'Legal Pages' },
]

export default function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-shrink-0 rounded-lg px-3.5 py-2.5 text-[13.5px] font-semibold transition ${
                  isActive ? 'bg-royal text-white' : 'text-charcoal hover:bg-royal/5'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
