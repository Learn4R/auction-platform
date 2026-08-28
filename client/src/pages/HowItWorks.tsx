import { Link } from 'react-router-dom'

const STEPS = [
  {
    n: '01',
    title: 'Register & Verify',
    body: 'Create a free account to start bidding. Sellers additionally complete a short verification step before they can list items.',
  },
  {
    n: '02',
    title: 'Browse & Watch',
    body: 'Explore live, upcoming, and archived lots by category. Save anything you like to your watchlist, or set a reminder for an upcoming auction.',
  },
  {
    n: '03',
    title: 'Bid — Live or Maximum',
    body: 'Place a bid manually, or set a maximum bid and let the system automatically bid on your behalf, in increments, up to your ceiling. If a bid lands in the final 30 seconds, the auction automatically extends by 30 seconds so no one gets sniped.',
  },
  {
    n: '04',
    title: 'Win & Pay',
    body: "If you're the highest bidder when the auction closes, an order is created automatically for your winning bid plus the buyer's premium. Pay securely from your dashboard.",
  },
  {
    n: '05',
    title: 'Receive Your Lot',
    body: 'The seller ships your item and you can track its progress — processing, shipped, in transit, delivered — right from your Orders page.',
  },
]

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h1 className="mb-2 font-display text-3xl text-royal">How It Works</h1>
      <p className="mb-10 text-sm text-gray-500">
        A quick walkthrough of buying and selling on Mudra House. See our{' '}
        <Link to="/legal/auction-terms" className="font-semibold text-royal underline">
          Auction Terms
        </Link>{' '}
        for the full details.
      </p>

      <div className="flex flex-col gap-8">
        {STEPS.map((step) => (
          <div key={step.n} className="flex gap-5">
            <div className="flex-none font-mono text-2xl font-semibold text-gold">{step.n}</div>
            <div>
              <h2 className="mb-1.5 font-display text-xl font-medium text-royal">{step.title}</h2>
              <p className="text-[14.5px] leading-relaxed text-charcoal">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-wrap gap-3.5 border-t border-gray-100 pt-8">
        <Link
          to="/browse?status=live"
          className="inline-flex items-center justify-center rounded-lg bg-royal px-6 py-3.5 text-[14.5px] font-semibold text-white transition hover:bg-deepblue"
        >
          Explore Live Auctions
        </Link>
        <Link
          to="/sell"
          className="inline-flex items-center justify-center rounded-lg border-[1.4px] border-royal px-6 py-3.5 text-[14.5px] font-semibold text-royal transition hover:bg-royal hover:text-white"
        >
          Start Selling
        </Link>
      </div>
    </div>
  )
}
