# Mudra House — UI/UX Design Audit

**Conducted:** 2026-08-29, as a design review of the live application (not a code review — see the separate `PROJECT_AUDIT.md` for that). Every finding below is anchored to an actual screenshot, taken with Playwright against the running app, populated with realistic content (not empty states) across logged-out, buyer, seller, and admin views, at both desktop (1280px) and mobile (390px) widths.

All referenced screenshots live in `ux-audit-screenshots/` at the repo root (49 files). Nothing was fixed as part of this pass — this is findings only.

---

## Methodology notes (read before the findings — two false positives to avoid re-discovering)

1. **Full-page screenshots of a `position: sticky`/`fixed` element will show it twice.** The header (`Header.tsx`) is `sticky top-0`, and the mobile live-auction page has its own `fixed inset-x-0 bottom-0` quick-bid bar. Playwright's `fullPage: true` capture stitches together multiple scroll positions, so a sticky/fixed element gets baked in at each one — it *looks* like a duplicated, overlapping element in the screenshot even though it renders correctly in a real browser. I caught this exact false alarm on `live-auction-loggedout-mobile.png` (looked like two stacked "Log In to Bid" buttons) and verified the real behavior with non-fullPage, scrolled viewport captures (`live-auction-mobile-top-viewport.png`, `live-auction-mobile-scrolled-viewport.png`) — the sticky bar is correctly hidden until scrolled past, then pins cleanly with no overlap. The same artifact shows up as an apparent header overlap on `sell-step6-review-mobile.png`. **Neither is a real bug.**
2. **The two identical "You've been outbid" notifications** on `notifications-desktop.png` / `dashboard-desktop.png` are an artifact of my own test-data setup script (it both placed real bids that triggered a real notification *and* separately inserted a duplicate one directly), not a product bug. Flagged here so it isn't mistaken for a duplicate-notification bug in a future pass.
3. One duplicate "Mughal Gold Mohur" listing appeared in early captures from a partially-failed test-setup retry (a real second DB row, not a rendering bug) — it was found, the stray row deleted, and the affected screenshots (`home-*`, `browse-*`, `upcoming-*`) re-captured clean before review. Not a finding, just noted for transparency.

---

## Findings by page

### Home (`home-desktop.png`, `home-mobile.png`)

- **"Featured Lots" and "Live Now" show almost identical content.** With the current inventory, both sections list the same 3 live items in the same order — "Featured Lots" is really just "Live Now" plus one upcoming item appended. There's no visible curation logic distinguishing what's "featured" from what's simply live. As the catalog grows this may resolve itself, but right now the homepage spends two consecutive full-width sections saying almost the same thing.
- **Category pill grammar**: "Princely State Coins · 1 lots", "Rare Currency Notes · 1 lots" — singular counts render with plural "lots". Trivial, but visible on every homepage load with typical demo/early data volumes.
- **Strength worth preserving**: the circular "1901 · ONE RUPEE · SILVER" lot-ticket graphic in the hero is a genuinely distinctive, on-brand piece of illustration — it's doing real work establishing the "auction house" feel and nothing else in the app quite matches its craft. Good anchor for the brand.

### Browse (`browse-desktop.png`, `browse-mobile.png`)

- Grid, filter sidebar, and card layout are clean and consistent with the design system. No issues found at either width — this page (along with Archive) is the most mature layout in the app.
- Sidebar filters (Status/Category/Year/Material/Condition/Grade/Certificate) are dense but well-grouped with consistent label styling; no competing-hierarchy problem here despite the number of controls, because they're stacked vertically with clear section labels rather than crowded together.

### Upcoming Auctions (`upcoming-desktop.png`)

- No design issues in the layout itself. With only one item in the test data the page reads very sparse (a single card in an otherwise-empty grid with a lot of surrounding whitespace) — worth a real check once there's more real inventory, but this is a data-volume artifact, not a layout bug.

### Archive (`archive-desktop.png`)

- **"SOLD" badge on lots with "0 bids".** Several archive cards (e.g. "Mughal Silver Rupee, Shah Jahan, Surat Mint" — hammer price ₹96,000, 0 bids) show a hammer price and a "SOLD" badge despite recording zero actual bids. This traces to seed data where `currentBid` was set directly rather than via a real `Bid` row, so it's likely not reachable with real user activity — but if any future test/seed data follows the same shortcut, it will keep producing this visually contradictory state ("sold" with no buyer activity). Worth a guard if that data path is still used anywhere.

### Item Detail — non-live (`item-detail-upcoming-desktop.png`, `-mobile.png`)

- **"Sold by [Seller]" is used regardless of auction state.** This exact phrase appears under the title on an item that hasn't even started its auction yet ("UPCOMING" / "Auction Not Started"). It also appears on the live auction page mid-bidding. "Sold by" only makes sense post-sale; everywhere else it should read something neutral like "Listed by" or "Seller:". This is a single shared string used across every item-detail variant, so it's a one-place fix with an app-wide payoff.
- **Large dead-space column on desktop.** The right-hand price/bid-ticket card is short (starting bid, starts-in, increment, one button) and simply stops about a third of the way down the page, leaving a large empty white column next to the still-continuing left column (spec table → description → authenticity box → bid history → seller). On mobile this isn't a problem (the ticket card naturally reflows to the bottom), but on desktop it reads unbalanced. A sticky position on that card, or additional content (e.g. watcher count, similar lots), would fill it.
- **Condition is shown twice** in quick succession — once in the general spec table, once again inside the Authenticity & Provenance box a few hundred pixels below. Both were built in separate phases for good reason (general specs vs. trust signals), but visually, scanning the page, it reads as redundant rather than reinforcing.

### Live Auction (`live-auction-loggedout-desktop.png`, `live-auction-buyer-desktop.png`, mobile variants)

- This is the strongest screen in the app. The dark immersive hero, gold-accented "lot ticket" stat row (Current Bid / Time Left / Active Bidders), the green "You are currently winning this lot" banner, and the functional bid input all read as a cohesive, purpose-built moment — worth treating as the reference standard for what the rest of the app's "important" screens should aspire to.
- Same "Sold by" and dead-space-in-the-sidebar issues as the non-live item page apply here too (see above) — the "Live Bid History" box on the right is short and leaves a large empty column below it once there are only a few bids.
- Mobile sticky bid bar behaves correctly once verified outside the full-page-screenshot artifact (see Methodology note #1) — no action needed, just confirming it wasn't silently broken.

### Login / Signup (`login-desktop.png`, `signup-desktop.png`, mobile variants)

- Both forms are clean, minimal, and visually identical in structure to each other — good consistency.
- **Significant unused vertical space on desktop.** The form sits near the top of the viewport with roughly 400–500px of empty cream background below it before the footer. A vertically-centered form (a near-universal convention for auth pages) would look far more intentional; right now it reads like the page forgot to center itself. Less of an issue on mobile, where the shorter viewport leaves less dead space.

### Legal pages (`legal-terms-desktop.png`, `legal-terms-mobile.png`)

- **Body text has no max-width on desktop.** At 1280px, paragraph lines run the near-full content width — well over 100 characters per line in places. That's roughly 40–50% past typical readability guidance (~65–75 characters/line) for dense legal prose. A `max-w-2xl`/`max-w-3xl` constraint on the text column would fix this without touching anything else on the page. Not an issue on mobile, where the narrow viewport naturally caps line length.
- Otherwise well-organized: numbered sections, consistent heading style, "Last updated" timestamp — good pattern, just needs the width constraint.

### My Dashboard — buyer (`dashboard-desktop.png`, `dashboard-mobile.png`)

- Desktop: clean, well-proportioned. Five KPI cards use the "lot ticket" numeric style consistently and don't compete with each other for attention — good hierarchy here, no complaints.
- **Mobile: the My Bids table is genuinely broken, not just cramped.** The tab row is clipped mid-label ("Auctions Lost" → "Au") with no scroll affordance, and the table itself loses its "Ends In" column entirely off the right edge, with "Status" clipped to "STATU" — and no visible cue (gradient edge, arrow, partial-column peek) that there's more content to scroll to. The item title also wraps across up to six lines in the narrow first column since it's a shrunk desktop table rather than a mobile-appropriate stacked-card layout, unlike `My Listings`, which handles the equivalent seller-side data as clean stacked cards. This is the single clearest instance in the whole audit of one page's mobile treatment lagging behind a near-identical page elsewhere in the app.

### Notifications (`notifications-desktop.png`, `notifications-mobile.png`)

- Clean on both widths, good use of the unread-dot pattern, pagination footer reads clearly ("Page 1 of 1 · 5 total"). No issues.

### My Listings — seller (`my-listings-desktop.png`, `my-listings-mobile.png`)

- Best-executed data-dense page in the app after Live Auction. KPI row, listings-with-status-badges, Drafts, and Payouts sections are all clearly separated with real hierarchy, and the mobile reflow (stacked label/value pairs, full-width cards) is exactly the pattern the buyer Dashboard's My Bids table is missing.
- Minor clarity gap: "Earnings: ₹0" sits directly next to "Pending Payout: ₹21,600" with no distinguishing label explaining that Earnings means *already paid out* — a seller glancing at both numbers together could reasonably wonder why they don't add up.

### Sell an Item wizard, 6 steps (`sell-step1…6-*-desktop.png`, plus 3 mobile)

- **Step 1 (Category) and Step 3 (Photos) are extremely sparse relative to the page's reserved height** — a single dropdown, or three 80×80px thumbnails, sitting atop 600–700px of empty cream background before the footer. This is the same "dead space" pattern as Login/Signup/Item Detail, but more pronounced here because the wizard's step-by-step nature means a user hits this repeatedly, once per short step, throughout the flow.
- **Photo thumbnails are small (80×80px)** for a platform whose core value proposition is examining fine detail on rare coins/notes. A seller can't meaningfully verify focus, crop, or lighting at that size before submitting. Larger previews (or a click-to-enlarge) would suit the numismatic audience better.
- **Step 6 (Review) shows raw, unformatted data where the rest of the app formats it.** This is the clearest, most concrete finding in the whole wizard:
  - `Starting Bid: ₹18000` / `Bid Increment: ₹1000` — no thousands separator, while literally every other price in the app (Home, Browse, Item Detail, Dashboard, My Listings) renders as `₹18,000` via a shared currency formatter.
  - `Start Time: 2026-08-29T11:06` / `End Time: 2026-09-01T10:06` — raw ISO datetime strings, not the `29 Aug 2026, 11:06 am`-style formatting used everywhere else (Browse cards, Item Detail, Archive, Dashboard, Notifications, My Listings all format dates the same friendly way).
  - This is the one screen where a seller is asked to do a final trust-building check before submitting a real auction, and it's the one screen in the entire app that looks unfinished/unformatted. High-value, low-effort fix — likely just swapping in the same `formatCurrency`/`formatDateTime` helpers already used everywhere else.
- Steps 2, 4, 5 are appropriately dense two-column forms with consistent field styling — no complaints there.
- Mobile steps reflow correctly (single column, full-width fields); the apparent header overlap on the mobile review step is the sticky-header screenshot artifact from Methodology note #1, not a real bug.

### Admin — Dashboard (`admin-dashboard-desktop.png`, `admin-dashboard-mobile.png`)

- **Ten KPI numbers, zero visual hierarchy between them.** Total Users, Total Sellers, Verified Sellers, Live Auctions, Upcoming Auctions, Completed Auctions, Total Sales Value, Platform Revenue, Pending Seller Approvals, and Pending Payments are all rendered identically — same size, same navy-blue bold serif, same card style. An admin scanning for "what needs my attention today" gets no visual cue that *Pending Seller Approvals* and *Pending Payments* (action items) are different in kind from *Total Users* (informational trivia). This is the single clearest example in the app of the "too many competing numbers, nothing prioritized" pattern called out in the brief.
- The Recent Sales chart renders correctly (Recharts working, axis/gridlines clean) but with only one data point it shows a single hollow circle with no line — reads oddly sparse with low data volume; not a design flaw, just worth re-checking once there's a real sales history to plot.
- Mobile reflow to a 2-column KPI grid works fine — this specific page handles narrow viewports correctly, unlike several of its siblings below.

### Admin — Item Approvals (`admin-approvals-desktop.png`, `admin-approvals-mobile.png`)

- Desktop: four action buttons (Mark Under Review / Approve / Request Changes / Reject) are reasonably well-differentiated — Approve is the only solid-filled button, correctly reading as the primary action, with the other three as lighter outlined variants. Good instinct here, no complaint.
- **Mobile: genuine horizontal page overflow — the most visually obvious bug found in this audit.** The four-button action row does not wrap on a 390px viewport; instead of stacking to a second line, it forces the entire card (and with it, the whole page body) wider than the viewport. This is visible directly in the screenshot: the ivory page background stops short of the right edge while the navy footer band still spans full width behind it, and the "Reject" button and the "Ends:" date are both cut off at the edge of the screen with no way to see them without the browser's own pinch-zoom. This needs `flex-wrap` (or a vertical button stack) on that action row for narrow viewports.

### Admin — Seller Applications (`admin-seller-applications-desktop.png`)

- **The applicant's raw email is the visually dominant identifier, above their actual name.** The card leads with an all-caps monospace line (`UXAUDIT-APPLICANT-…@EXAMPLE.COM · APPLIED …`) before the applicant's name ("Arjun Mehta") appears below it in the page's normal serif type. For a card whose entire purpose is "should we trust this person to sell," the human name is the thing an admin actually needs to scan for first — right now the technical/machine-readable string outranks it visually.

### Admin — Orders (`admin-orders-desktop.png`)

- Clean integration of the refund flow built in an earlier phase — the "Issue Refund" button, shipping-progress ticker, and shipping-address block all sit together without crowding. No issues found.

### Admin — Payouts, Categories, Settings (`admin-payouts-desktop.png`, `admin-categories-desktop.png`, `admin-settings-desktop.png`)

- All three are clean, low-density, no findings.

### Admin — Sellers (`admin-sellers-desktop.png`)

- **This is a real `<table>`**, structurally different from the card-per-row pattern used by Approvals, Orders, Payouts, Categories, and Seller Applications. Functionally fine, but it's a second visual language for "list of entities with an action" inside the same admin section — a new admin user has to re-learn the row/column table pattern here after getting used to bordered cards everywhere else.

### Admin — Audit Log (`admin-audit-log-desktop.png`, `admin-audit-log-mobile.png`)

- **Second instance of the table-vs-card inconsistency** noted under Sellers above — Audit Log is also a genuine `<table>`, not a card list.
- **Raw, inconsistently-cased action strings leak directly into the UI.** The Action column shows `APPROVE_SELLER_APPLICATION` (untouched snake_case, uppercased) right next to `VERIFIED SELLER` (space-separated instead of underscored) in the very next row — two different raw-string transformations sitting one row apart, which reads like a bug even though it's really just "some actions have a friendly label defined, others fall back to a raw display." Worth checking whether the two refund actions added in the most recent phase (`refund_order`, `refund_order_payout_already_paid`) have friendly labels defined here too, or whether they'll surface as more raw snake_case strings once used for real.
- **Mobile: functionally broken, not just cramped.** The admin sidebar nav is squeezed into a horizontally-scrolling single row at the top with labels clipped ("Seller Applicat…") and no scroll affordance, and the table itself only shows the Action and Admin columns — **Target and Timestamp are completely off-screen with no indication they exist.** An admin reviewing activity from a phone cannot see *what was acted on* or *when* — the two most important columns for an audit log are the two that are invisible.

### Admin — Legal Pages (`admin-legal-desktop.png`)

- Clean tab-per-document editor, clear "Draft template — not certified legal advice" warning banner, raw-markdown-with-instructions textarea is a sensible low-effort editing UI. No issues.

---

## Cross-cutting patterns (seen more than once, listed once)

- **"Sold by [Seller]" used regardless of auction state** — appears on upcoming, live, and presumably ended item pages alike. One shared string, app-wide fix.
- **Dead vertical space on desktop, specifically on short-content pages**: Login, Signup, Item Detail (non-live) sidebar, and especially the Sell wizard's Category/Photos steps. All share the same root cause — a narrow content column with nothing constraining/centering it vertically within a tall viewport.
- **Two different "list of entities" patterns inside Admin**: bordered-card-per-row (Approvals, Seller Applications, Orders, Payouts, Categories) vs. genuine `<table>` (Sellers, Audit Log). Neither is wrong on its own, but a new admin has to context-switch between two different scanning patterns depending on which page they're on.
- **Currency/date formatting inconsistency, isolated to one screen**: the Sell wizard's Review step is the only place in the entire app where prices and dates are shown unformatted, everywhere else uses the shared formatters.
- **Mobile admin pages fall into two clear tiers**: Dashboard, My Listings-adjacent buyer/seller pages, and most public pages reflow well. Anything built as a straight `<table>` (Sellers, Audit Log) or a multi-button action row without wrap handling (Approvals) breaks meaningfully on a 390px viewport — this matches and now visually confirms what the earlier code-based audit (`PROJECT_AUDIT.md`) predicted from static analysis of breakpoint usage.

---

## Prioritized list — what's most worth fixing first

**P0 — visibly broken, not just suboptimal**
1. Admin Approvals mobile: horizontal page overflow from the unwrapped 4-button action row (`admin-approvals-mobile.png`).
2. Admin Audit Log mobile: Target and Timestamp columns completely inaccessible; sidebar nav clipped with no scroll affordance (`admin-audit-log-mobile.png`).
3. Buyer Dashboard mobile: My Bids table loses its "Ends In" column and clips the tab row, with zero indication there's more to scroll to (`dashboard-mobile.png`).

**P1 — small effort, disproportionate polish payoff**
4. Sell wizard Step 6 (Review): format currency with thousands separators and dates with the app's standard date formatter, matching every other screen (`sell-step6-review-desktop.png`).
5. Replace "Sold by [Seller]" with status-neutral copy ("Listed by" / "Seller:") across item detail and live auction pages.
6. Legal pages: constrain body text to a readable max-width on desktop (`legal-terms-desktop.png`).

**P2 — real, but lower urgency**
7. Vertically center (or otherwise fill) Login, Signup, and the Sell wizard's sparse steps (Category, Photos) on tall desktop viewports.
8. Admin Dashboard: give Pending Seller Approvals / Pending Payments (action items) distinct visual weight from purely informational counts like Total Users.
9. Unify the admin section's two "list of entities" patterns (card vs. table) — or at minimum, make the two tables (Sellers, Audit Log) mobile-responsive to match the card-based pages.
10. Audit Log: give every `AdminAction.action` value — including the newer refund ones — a proper human-readable label instead of falling back to a raw string.
11. Seller Applications: re-order the card header so the applicant's name leads and the email is secondary metadata.

**P3 — polish, no rush**
12. Home: differentiate "Featured Lots" from "Live Now" with actual curation logic, or merge them once there's enough inventory that the overlap stops being visible.
13. Fix "1 lots" → "1 lot" pluralization on category counts.
14. Enlarge Sell wizard photo thumbnails (or add click-to-zoom) for a numismatic audience that needs to check fine detail.
15. My Listings: clarify "Earnings" vs. "Pending Payout" with a tooltip or subtext so the two numbers don't read as contradictory.
16. Item Detail / Live Auction: resolve or accept the duplicated "Condition" line between the spec table and the Authenticity box.
