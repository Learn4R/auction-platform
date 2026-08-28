export interface LegalPageDef {
  slug: string
  title: string
  content: string
}

export const legalPageDefs: LegalPageDef[] = [
  {
    slug: 'terms-and-conditions',
    title: 'Terms & Conditions',
    content: `## 1. Acceptance of These Terms

By creating an account or using Mudra House in any way, you agree to these Terms & Conditions, our Auction Terms, our Privacy Policy, and our Shipping Policy. If you do not agree, please do not use the platform.

## 2. Who Can Use Mudra House

You must be at least 18 years old and able to form a binding contract under Indian law to register an account. You are responsible for providing accurate registration information and for keeping it up to date.

## 3. Account Types and Responsibilities

Mudra House has three account roles:

- Buyers can browse, bid, win auctions, and pay for won items.
- Sellers can submit items for listing, subject to admin review and approval, and receive payouts once a buyer pays.
- Admins review listings, manage disputes, and operate the platform.

You are responsible for all activity under your account, including bids placed and listings submitted from it. Keep your password confidential and tell us immediately if you suspect unauthorized access.

## 4. Listing Review

Every item a seller submits is reviewed by an admin before it goes live for bidding. Admin approval confirms the listing meets our basic content and completeness standards — it is not a guarantee of authenticity, grade, or value. See our Authenticity Disclaimer for details.

## 5. Prohibited Conduct

You may not: use another person's account without permission; place bids you do not intend to honour; attempt to manipulate an auction's price through shill bidding or collusion; submit listings for items you do not have the right to sell; or attempt to circumvent, disable, or otherwise interfere with the security or proper functioning of the platform.

## 6. Cancellations and Disputes

Winning bids create a binding obligation to pay. Once an auction ends, cancellation is only possible in limited circumstances — for example, a clear listing error or a seller-side issue identified before payment is made. Raise disputes as early as possible by contacting support with your order number; we will review the bidding and listing history and respond with a resolution or next steps.

## 7. Suspension and Termination

We may suspend or terminate an account that violates these terms, engages in fraudulent activity, or repeatedly fails to pay for won auctions. You may close your account at any time by contacting support, subject to settling any outstanding orders or payouts.

## 8. Limitation of Liability

Mudra House provides a platform connecting buyers and sellers. To the fullest extent permitted by law, we are not liable for indirect or consequential losses arising from a transaction between users, including disputes over an item's condition, authenticity, or value.

## 9. Changes to These Terms

We may update these terms from time to time. Continued use of the platform after an update constitutes acceptance of the revised terms.

## 10. Governing Law

These terms are governed by the laws of India, and any disputes are subject to the jurisdiction of the courts where Mudra House is registered.

## 11. Contact

Questions about these terms can be sent to our support team through the contact details listed on the platform.`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    content: `## 1. What We Collect

We collect the information you provide directly, such as your name, email address, and password when you register, along with any images and descriptions you upload as a seller. We also collect activity data generated through your use of the platform, including bids placed, maximum bids set, watchlist activity, orders, and reviews.

## 2. Payment Information

Payments are processed by Razorpay, our third-party payment partner. We do not store your card, UPI, or bank account details ourselves — we retain only the payment and order identifiers needed to confirm a transaction and calculate payouts.

## 3. How We Use Your Information

We use your information to operate the platform: to run auctions and process bids, to create and fulfil orders, to calculate and pay out seller commissions, to send you account and auction notifications, and to investigate disputes or suspected misuse.

## 4. What We Share, and With Whom

We share the minimum information necessary with:

- Razorpay, to process your payments.
- Our storage provider, to host listing images you upload.
- Couriers and shipping partners, limited to the delivery details a seller needs to ship you a won item.

We do not sell your personal information to third parties.

## 5. Cookies and Local Storage

We use your browser's local storage to keep you signed in and to remember lightweight preferences. We do not use third-party advertising trackers.

## 6. Data Retention

We retain account and transaction data for as long as your account is active and for a reasonable period afterward to meet legal, accounting, and dispute-resolution obligations.

## 7. Your Rights

You can review and update your account information at any time while logged in. You may request a copy of your data or ask us to delete your account by contacting support; we will action deletion requests except where we are required to retain records (for example, completed order history) for legal or accounting purposes.

## 8. Security

We use industry-standard measures — including password hashing and encrypted connections — to protect your information. No system is completely secure, so we encourage you to use a strong, unique password.

## 9. Changes to This Policy

We may update this policy periodically. Material changes will be reflected here with an updated revision date.

## 10. Contact

For privacy questions or data requests, contact our support team through the contact details listed on the platform.`,
  },
  {
    slug: 'auction-terms',
    title: 'Auction Terms',
    content: `## 1. How Bidding Works

Each auction has a starting bid and a fixed bid increment. Every new bid must meet or exceed the current bid plus the increment. The highest bid when an auction closes wins, provided it meets the reserve set by the listing (if any).

## 2. Maximum (Proxy) Bidding

Instead of placing bids manually each time you're outbid, you can set a maximum bid. The system will automatically bid on your behalf, in increments, up to your maximum — only as much as needed to keep you in the lead. Other bidders never see your maximum, only the current price it produces. If two bidders set maximums, the system resolves them automatically to the point where the higher maximum wins at one increment above the lower one.

## 3. Anti-Snipe Extensions

To keep bidding fair, if any bid — manual or proxy — is placed within the final 30 seconds of an auction, the closing time automatically extends by 30 seconds. This can repeat as long as new bids keep arriving in the extended window, giving every bidder a fair chance to respond before the auction truly closes.

## 4. Buyer's Premium

A buyer's premium — a percentage of your winning bid — is added on top to calculate your order total. The current premium percentage is always shown before you confirm any bid and again at checkout, so you know your full cost before committing.

## 5. Winning and Payment

If you have the winning bid when an auction closes, an order is created automatically for the winning bid plus the buyer's premium. Payment is made securely through Razorpay from your Orders page. Please complete payment promptly — unpaid orders may be cancelled and, for repeated non-payment, may result in account restrictions.

## 6. Once You've Won

A winning bid is a binding commitment to purchase. Winning bids cannot be withdrawn after an auction closes. If you believe a genuine error occurred (for example, a mistaken bid amount), contact support immediately, before making payment.

## 7. Seller Payouts

Once your payment is confirmed, the seller's payout — the winning bid minus the platform's seller commission — is created automatically and processed by our team through to payment.

## 8. Auction Cancellation

We reserve the right to cancel or suspend an auction before it closes if a listing is found to violate our policies, if a clear technical error occurred, or if we reasonably suspect manipulated bidding.`,
  },
  {
    slug: 'authenticity-disclaimer',
    title: 'Authenticity Disclaimer',
    content: `## What "Reviewed Listing" Means

Every item on Mudra House is reviewed by an admin before it is approved for auction. This review checks that the listing is complete, that the description and proposed auction details are reasonable, and that the content complies with our platform policies.

## What It Does Not Mean

Admin approval is not authentication, grading, or a guarantee of genuineness, origin, date, or condition. Our admins are not professional numismatists or antiquities appraisers, and listing review does not involve independent expert examination of the physical item. All descriptions of condition, material, year, and provenance are provided by the seller and reflect the seller's own representations.

## Seller Responsibility

Sellers are solely responsible for the accuracy of their listings, including any claims about authenticity, grade, material composition, and history. Misrepresenting an item is a violation of our Terms & Conditions and may result in account suspension and removal of the listing.

## Our Recommendation

For higher-value items, we strongly encourage buyers to review all listing photographs and descriptions carefully, ask the seller questions before bidding where possible, and, for significant purchases, seek independent expert verification. Bidding is a binding commitment, so please bid only once you are comfortable with the information provided.

## If You Have a Concern

If you receive an item you believe was materially misrepresented, contact support with your order number and details as soon as possible. We will review the listing and communication history and work with both parties toward a resolution, which may include mediation between buyer and seller. Mudra House's role is to facilitate this process; we do not independently authenticate items and cannot guarantee a particular outcome.

## Limitation

To the fullest extent permitted by law, Mudra House is not liable for losses arising from a disputed claim of authenticity between a buyer and seller. Our facilitation of a dispute does not constitute an admission of liability.`,
  },
  {
    slug: 'shipping-policy',
    title: 'Shipping Policy',
    content: `## Where We Ship

Mudra House currently supports shipping within India only.

## Processing Time

Once your order is paid, the seller is expected to pack and dispatch your item within 3 business days. You can track progress — Processing, Shipped, In Transit, Delivered — from your Orders page at any time.

## Estimated Delivery Timelines

Once dispatched, typical delivery timelines within India are:

- Metro cities (Delhi NCR, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad): 2–4 business days.
- Other cities and towns: 4–7 business days.
- Remote or rural pin codes: 7–10 business days.

These are estimates, not guarantees, and can vary with courier load, weather, and local conditions, particularly around festival periods.

## Packaging

Given the nature of items sold on Mudra House — coins, currency notes, and other small collectibles — sellers are expected to use protective packaging (capsules, holders, or rigid mailers as appropriate) and, for higher-value items, insured and tracked courier services.

## Delivery and Inspection

Please inspect your package on arrival. If it appears damaged in transit, note this with the courier if possible, take photographs before opening, and contact support within 48 hours of delivery so we can assist with the seller and, where applicable, a courier insurance claim.

## Delivery Attempts and Non-Receipt

Couriers will typically make multiple delivery attempts before returning a package to the seller. Please keep your delivery address and contact number current, and respond promptly to courier calls or messages to avoid delays or returns.

## Questions

For questions about a specific shipment, contact support with your order number and we'll help coordinate with the seller and courier.`,
  },
]
