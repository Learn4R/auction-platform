import type { PaymentStatus, ShippingStatus } from '../lib/api'

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-gold/10 text-[#8a6e18]',
  paid: 'bg-green/10 text-green',
  failed: 'bg-red/10 text-red',
  refunded: 'bg-gray-100 text-gray-500',
}

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending Payment',
  paid: 'Paid',
  failed: 'Payment Failed',
  refunded: 'Refunded',
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider uppercase ${PAYMENT_STYLES[status]}`}
    >
      {PAYMENT_LABELS[status]}
    </span>
  )
}

const SHIPPING_STEPS: { value: ShippingStatus; label: string }[] = [
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'inTransit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
]

export function ShippingProgress({ status }: { status: ShippingStatus }) {
  const activeIndex = SHIPPING_STEPS.findIndex((s) => s.value === status)

  return (
    <div className="flex items-center gap-1.5">
      {SHIPPING_STEPS.map((step, i) => (
        <div key={step.value} className="flex flex-1 items-center gap-1.5">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`h-2.5 w-2.5 rounded-full ${i <= activeIndex ? 'bg-royal' : 'bg-gray-200'}`}
            />
            <span
              className={`text-center font-mono text-[9.5px] tracking-wide uppercase ${i <= activeIndex ? 'font-semibold text-royal' : 'text-gray-400'}`}
            >
              {step.label}
            </span>
          </div>
          {i < SHIPPING_STEPS.length - 1 && (
            <div className={`mb-4 h-px flex-1 ${i < activeIndex ? 'bg-royal' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}
