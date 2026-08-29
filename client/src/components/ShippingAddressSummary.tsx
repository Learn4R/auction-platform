import type { Order } from '../lib/api'

// Reused on both the buyer's own order view and the admin orders view —
// `compact` drops the section's own spacing/border when it's placed inside
// a row that already provides that (e.g. next to the shipping-status control).
export function ShippingAddressSummary({ order, compact = false }: { order: Order; compact?: boolean }) {
  if (!order.shippingAddressLine1) return null

  return (
    <div className={compact ? '' : 'mt-4 border-t border-gray-100 pt-4'}>
      <div className="mb-1.5 font-mono text-[10px] tracking-wider text-gray-500 uppercase">Shipping To</div>
      <div className="text-[13px] leading-relaxed text-charcoal">
        <div className="font-semibold">{order.shippingName}</div>
        <div>{order.shippingAddressLine1}</div>
        {order.shippingAddressLine2 && <div>{order.shippingAddressLine2}</div>}
        <div>
          {order.shippingCity}, {order.shippingState} {order.shippingPincode}
        </div>
        <div className="mt-1 text-gray-500">{order.shippingPhone}</div>
      </div>
    </div>
  )
}
