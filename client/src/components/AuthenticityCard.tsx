import type { ItemDetail } from '../lib/api'

type AuthenticityItem = Pick<
  ItemDetail,
  'seller' | 'certificateNumber' | 'gradingCompany' | 'provenance' | 'condition' | 'isReviewed'
>

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 font-mono text-[10.5px] font-semibold tracking-wider text-green uppercase">
      {children}
    </span>
  )
}

// A distinct trust-signal summary, separate from the general spec table —
// what's declared/checked, not an authentication or authenticity guarantee.
export function AuthenticityCard({ item }: { item: AuthenticityItem }) {
  const hasCertificate = !!item.certificateNumber

  return (
    <div className="mt-6 rounded-xl border border-royal/10 bg-[#F8F6EE] p-5">
      <h5 className="mb-3.5 font-mono text-[11px] tracking-wider text-gray-500 uppercase">
        Authenticity &amp; Provenance
      </h5>

      <div className="mb-4 flex flex-wrap gap-2">
        {item.seller.verified && <Badge>Verified Seller</Badge>}
        {item.isReviewed && <Badge>Admin Reviewed</Badge>}
        {hasCertificate && <Badge>Certificate Available{item.gradingCompany ? ` — ${item.gradingCompany}` : ''}</Badge>}
      </div>

      {item.condition && (
        <div className="mb-3 text-[13px]">
          <span className="text-gray-500">Condition: </span>
          <span className="font-semibold text-charcoal">{item.condition}</span>
        </div>
      )}

      {item.provenance && (
        <div className="text-[13px] leading-relaxed text-charcoal">
          <div className="mb-1 text-gray-500">Provenance</div>
          {item.provenance}
        </div>
      )}

      <p className="mt-4 border-t border-royal/10 pt-3 text-[11.5px] leading-relaxed text-gray-500">
        Reviewed and certificate/grading information reflect what the seller has declared and what our team has
        checked for completeness — they are not an independent authentication or guarantee of authenticity.
      </p>
    </div>
  )
}
