import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getAdminOrders, getAdminStats, type AdminOrder, type AdminStats } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatCurrency } from '../../lib/format'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-royal/10 bg-white p-5">
      <div className="font-mono text-2xl font-semibold text-royal">{value}</div>
      <div className="mt-1.5 text-[11.5px] text-gray-500">{label}</div>
    </div>
  )
}

function buildSalesSeries(orders: AdminOrder[]) {
  const paid = orders.filter((o) => o.paymentStatus === 'paid')
  const byDay = new Map<string, number>()

  for (const order of paid) {
    const day = new Date(order.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
    byDay.set(day, (byDay.get(day) ?? 0) + Number(order.totalAmount))
  }

  return [...byDay.entries()].map(([day, total]) => ({ day, total }))
}

export default function Dashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    Promise.all([getAdminStats(token), getAdminOrders(token)])
      .then(([s, o]) => {
        setStats(s)
        setOrders(o)
      })
      .catch((err) => setError(err.message))
  }, [token])

  const salesSeries = useMemo(() => (orders ? buildSalesSeries(orders) : []), [orders])

  return (
    <div>
      <h1 className="mb-2 font-display text-3xl text-royal">Dashboard</h1>
      <p className="mb-8 text-sm text-gray-500">A snapshot of the marketplace right now.</p>

      {error && <p className="mb-4 text-sm text-red">{error}</p>}

      {!stats ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Total Sellers" value={stats.totalSellers} />
            <StatCard label="Verified Sellers" value={stats.verifiedSellers} />
            <StatCard label="Live Auctions" value={stats.liveAuctions} />
            <StatCard label="Upcoming Auctions" value={stats.upcomingAuctions} />
            <StatCard label="Completed Auctions" value={stats.completedAuctions} />
            <StatCard label="Total Sales Value" value={formatCurrency(stats.totalSalesValue)} />
            <StatCard label="Platform Revenue" value={formatCurrency(stats.platformRevenue)} />
            <StatCard label="Pending Seller Approvals" value={stats.pendingSellerApprovals} />
            <StatCard label="Pending Payments" value={stats.pendingPayments} />
          </div>

          <div className="mt-8 rounded-xl border border-royal/10 bg-white p-6">
            <h2 className="mb-4 font-display text-lg text-royal">Recent Sales</h2>
            {salesSeries.length === 0 ? (
              <p className="text-sm text-gray-500">No paid orders yet.</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesSeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickFormatter={(v) => `₹${v}`}
                    />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Line type="monotone" dataKey="total" stroke="#173B70" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
