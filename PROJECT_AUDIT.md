# Mudra House — Technical Audit & Development Roadmap

**Date:** 2026-08-29
**Scope:** Full-stack audit of the existing codebase — architecture, feature completeness, security, responsiveness, code quality — followed by a phased roadmap to production readiness. This is an *incremental improvement plan*, not a rewrite proposal: the existing architecture is sound and should be built on, not replaced.

---

## 1. Executive Summary

Mudra House is a working, well-architected Indian online auction platform for antiques, coins, currency, art, and collectibles. Built incrementally over ~28 commits, it already has a genuinely complete core transaction loop: browse → bid (live, proxy/max-bid, anti-snipe) → win → pay (Razorpay) → seller payout, plus a full moderation pipeline (seller onboarding → item submission → admin approval → resubmission), reviews, watchlists, real-time notifications, and an admin back office covering every major entity.

The codebase is clean: strict TypeScript on the server, no dead TODO/FIXME markers, no secrets committed, consistent design language, and — notably — no duplicated business logic where it matters most (bid math, payout math, status derivation are all computed once and reused). The gaps that exist are the *expected* gaps for a project that has focused on functional breadth over operational hardening: **there is no shipping-address collection anywhere in the data model**, **no payment webhook** (payment confirmation is entirely client-driven), **zero automated tests**, **no email verification or password reset**, and **the admin panel is not mobile-responsive**. None of these require architectural change — they're additive work within the existing patterns.

**Bottom line:** this is a strong MVP that needs a focused hardening pass, not a rebuild.

---

## 2. Tech Stack & Architecture

| Layer | Technology |
|---|---|
| Client | React 19, TypeScript, Vite 8, React Router v7, Tailwind CSS v4 (CSS-token theme, no CSS-in-JS), Recharts (admin charts), Socket.io-client |
| Server | Node.js, Express 5, TypeScript (strict), Prisma 7 ORM with `@prisma/adapter-pg` driver adapter, Socket.io |
| Database | PostgreSQL via Supabase (session pooler) |
| Auth | JWT (`jsonwebtoken`), bcrypt password hashing, Bearer-token based (no cookies/sessions) |
| Payments | Razorpay (checkout + server-side signature verification) |
| File storage | Supabase Storage (public bucket, `item-images`) |
| Real-time | Socket.io — live bid updates, auction state changes, in-app notifications |

**Monorepo layout:** two independent npm packages, `client/` and `server/`, no root package.json/workspace tooling (no Turborepo/Nx/pnpm workspaces) — each is run and built independently. This is fine at current scale; worth revisiting only if a shared types package becomes valuable.

**No test framework, no CI/CD, no containerization** are present anywhere in the repo (verified: no `jest`/`vitest`/`playwright` in either `package.json`, no `.github/workflows`, no `Dockerfile`/`docker-compose.yml`/`render.yaml`). The one "prepare for production deployment" commit (`1a5b4cc`) only externalized `CLIENT_URL`/`PORT` env vars for CORS/Socket.io — it did not add deployment infrastructure.

**Design system:** a single light "premium" theme defined via Tailwind v4 `@theme` tokens in `client/src/index.css` — `royal` (deep blue), `gold`/`champagne`, `ivory`, `charcoal`, plus semantic `green`/`red`. Typography: Newsreader (display serif), Inter (body), IBM Plex Mono (labels/numbers). No dark-mode variant exists; not flagged as a gap since nothing in the brief requires one, but worth noting explicitly since a future request for dark mode would be a new theme layer, not a refactor.

---

## 3. Feature Inventory — What's Already Built

Reconstructed from git history (28 commits) plus direct code reading. This is the "don't rebuild this" list.

- **Auth & roles**: register/login (buyer/seller; admin provisioned directly in DB), JWT with 1-day expiry, role-based route guards on both client (`RequireRole`) and server (`authenticate(...roles)`)
- **Item submission**: full 6-step wizard (`Sell.tsx`) — category/basics → numismatic detail fields (year, material, condition, denomination, mint, ruler/authority, period, weight, diameter, grade, certificate/grading company, provenance) → photos (up to 6, 5MB each, drag/preview) → pricing/schedule → review → submit or save-as-draft
- **Moderation lifecycle**: `draft → submitted → under_review → (approved | changes_requested | rejected)`, with resubmission after changes-requested, admin approval creates the `Auction` row transactionally
- **Seller onboarding**: separate seller-application flow (KYC-ish fields: PAN, bank account, address) gating who can list items, independent of account `role`
- **Live bidding engine**: real-time bids via Socket.io, server-authoritative proxy/max-bid cascade resolution, anti-snipe (30s-before-end bid extends auction by 30s, re-checked *inside* the DB transaction to close races), optimistic-concurrency guard on `currentBid` updates
- **Buyer dashboard**: KPI overview (active bids/won/lost/watchlist/pending payments), My Bids / Watchlist (with quick-bid) / Won Auctions / Auctions Lost tabs
- **Watchlist**: toggle from any item card; quick-bid directly from the watchlist card for live items, live-updating via the shared socket connection
- **Orders & payments**: Razorpay checkout, server-side HMAC signature verification, buyer premium + seller commission calculated from admin-configurable `PlatformSettings`, automatic `Payout` row creation on payment success
- **Reviews**: buyers can review sellers on completed orders; seller pages show average rating + review list
- **Payouts**: full seller-facing and admin-facing payout ledgers with status tracking (`pending/processing/paid/failed/on_hold`)
- **Notifications**: in-app, real-time (Socket.io) + persisted, bell dropdown (last 50) + full paginated history page, types cover outbid/won/listing approved/rejected/auction extended/started
- **Reminders**: "remind me" for upcoming (not-yet-started) auctions
- **Archive**: public record of completed auctions (hammer price, no buyer PII), filterable/sortable
- **Item filters**: category, status, year, period, material, condition, grade, certificate-available — dropdown options built from real distinct DB values, not a hardcoded list
- **Authenticity & Provenance section**: verified-seller / admin-reviewed / certificate-available badges with an explicit non-authentication disclaimer
- **Legal pages**: admin-editable content (ToS, privacy, auction terms, shipping policy, authenticity disclaimer), publicly rendered
- **Admin back office**: dashboard (KPIs + sales chart), listing approvals queue, seller-application queue, orders (shipping status control), payouts, categories CRUD, sellers (verify toggle), platform settings (commission %), audit log of every admin action
- **Mobile-responsive header/nav**: hamburger drawer, account menu, all confirmed working across phone/tablet in an earlier phase

---

## 4. Data Model Overview

Prisma schema (`server/prisma/schema.prisma`), 16 models, all relations intact, no orphaned/unused models found:

`User`, `Category`, `Item`, `Auction`, `Bid`, `MaxBid`, `Watchlist`, `Order`, `PlatformSettings`, `AdminAction`, `Notification`, `Review`, `SellerApplication`, `Reminder`, `LegalPage`, `Payout`.

**Notable gap in the data model itself** (not just missing UI): **no shipping-address field exists anywhere** — not on `User`, not on `Order`, not on `SellerApplication` (which only captures the *seller's* KYC address for payout purposes). For a platform whose entire purpose is selling and shipping physical antiques/coins/collectibles, there is currently no way for a winning buyer to provide, and no way for an admin/seller to see, a delivery address. This is the single most consequential data-model gap found in this audit and should be first in the roadmap.

**Dead enum value**: `PaymentStatus.refunded` is declared but never assigned anywhere in the codebase — no refund route, no Razorpay `refunds.create` call exists.

---

## 5. Server API Audit

### 5.1 Full Endpoint Inventory

Auth pattern: `authenticate(...allowedRoles: Role[])` in `server/src/middleware/auth.ts` is a middleware factory. Called with no args it requires any valid JWT; called with role names (`authenticate('admin')`) it also 403s non-matching roles. Several routes call `authenticate()` and then do an **inline** ownership/role check in the handler body (e.g. "is this seller approved," "is this your resource") — this is a consistent, easy-to-audit idiom used throughout, not an inconsistency.

| Mount | Route | Description | Auth |
|---|---|---|---|
| `/api/auth` | `POST /register` | Create buyer/seller account | Public (`authLimiter`) |
| | `POST /login` | Issue JWT (1-day expiry) | Public (`authLimiter`) |
| | `GET /me` | Return decoded JWT payload | Any logged-in user |
| `/api/items` | `GET /` | List approved items, filterable | Public |
| | `GET /filter-options` | Distinct real filter values | Public |
| | `POST /` | Create item + image upload | Any user; inline `sellerStatus==='approved'` check (admin bypasses) |
| | `GET /:id` | Single approved item + bids | Public |
| `/api/categories` | `GET /` | List categories w/ item counts | Public |
| `/api/seller` | `POST /apply` | Submit seller application | Any logged-in user |
| | `GET /application` | Own application/status | Any logged-in user |
| | `GET /dashboard-summary` | Seller dashboard stats | Any logged-in user |
| | `POST /items/draft` | Create draft listing | Approved seller |
| | `PATCH /items/:id` | Edit draft/rejected/changes-requested listing | Approved seller + ownership check |
| | `POST /items/:id/resubmit` | Resubmit for review | Approved seller + ownership check |
| | `GET /items` | List own items | `authenticate('seller')` |
| | `GET /payouts` | List own payouts | `authenticate('seller')` |
| `/api/sellers` | `GET /:id/reviews` | Seller's reviews + rating avg | Public |
| `/api/admin/*` | (see below) | All admin CRUD | `authenticate('admin')` on every route |
| `/api/auctions` | `GET /reminders/mine` | Auction ids user is reminding on | Any logged-in user |
| | `POST /:id/remind` | Toggle reminder | Any logged-in user |
| | `POST /:id/bids` | Place a bid | Any logged-in user + `bidLimiter` |
| | `POST /:id/max-bid` | Set proxy max bid | Any logged-in user + `bidLimiter` |
| `/api/orders` | `GET /` | List own orders | Any logged-in user |
| | `POST /:id/create-payment` | Create Razorpay order | Ownership check |
| | `POST /:id/verify-payment` | Verify signature, mark paid, create payout | Ownership check |
| | `POST /:id/review` | Review a seller | Ownership check |
| `/api/archive` | `GET /` | Ended-auction results | Public |
| `/api/watchlist` | `GET /` | List watchlisted items | Any logged-in user |
| | `POST /:itemId` | Toggle watchlist entry | Any logged-in user |
| `/api/bids` | `GET /mine` | Own bid history w/ win/loss | Any logged-in user |
| `/api/dashboard` | `GET /overview` | Buyer KPI summary | Any logged-in user |
| `/api/notifications` | `GET /` | Last 50 notifications | Any logged-in user |
| | `GET /all` | Paginated history | Any logged-in user |
| | `PATCH /:id/read` | Mark read | Ownership check |
| `/api/legal` | `GET /:slug` | Fetch a legal page | Public |

**`/api/admin/*` sub-routes** (all `authenticate('admin')`): `items` (pending/under-review queues, mark-under-review, request-changes, approve, reject), `legal` (edit), `orders` (list, set shipping status), `payouts` (list, set status), `stats` (dashboard counters), `settings` (get/patch commission %), `categories` (full CRUD), `sellers` (list, toggle verified), `seller-applications` (pending queue, approve, reject), `audit-log` (list). Every admin mutation is logged via `logAdminAction`/`AdminAction`.

### 5.2 Payment Flow — Detailed Trace

1. **Order creation** happens automatically when the scheduler ends an auction with a winner (`realtime/scheduler.ts`), not at checkout time.
2. **`POST /api/orders/:id/create-payment`**: ownership check → computes amount in paise → `razorpay.orders.create()` → persists `razorpayOrderId`.
3. **`POST /api/orders/:id/verify-payment`**: ownership check → confirms `razorpayOrderId` matches → computes `HMAC-SHA256(order_id|payment_id, RAZORPAY_KEY_SECRET)` and compares to the client-supplied signature (standard Razorpay checkout verification) → on match, in one transaction: `paymentStatus → paid`, `razorpayPaymentId` stored, `Payout` row created using the current seller-commission setting.
4. **No webhook exists.** `RAZORPAY_WEBHOOK_SECRET` is not in `.env.example`; no `/webhook` route. Payment confirmation depends entirely on the client successfully calling step 3 after Razorpay's checkout succeeds. If the tab closes, the network drops, or client JS throws between Razorpay's success callback and the verify call, the charge is captured but `Order.paymentStatus` stays `pending` forever with no reconciliation job to catch the mismatch.
5. **No refunds.** The `refunded` enum value is dead code — no refund route, no `razorpay.refunds.create()` call anywhere.

### 5.3 Security & Robustness Gaps (verified by reading code, not speculative)

- **No email verification** on signup — no format validation beyond non-empty, no verification email, no `emailVerified` field. (Don't confuse with the existing `User.verified` boolean, which is an admin-granted *seller trust badge*, unrelated to email/account verification.)
- **No password-reset flow** anywhere.
- **No email normalization** — `findUnique({ where: { email } })` is case-sensitive against a unique column; `User@x.com` and `user@x.com` can both register.
- **JWT: fixed 1-day expiry, no refresh, no server-side revocation** — a leaked token is valid up to 24h with no way to invalidate it early.
- **Rate limiting is narrow**: only `authLimiter` (register/login) and `bidLimiter` (bids/max-bids) exist. Item creation, image upload, reviews, watchlist toggles, and every admin mutation are unthrottled.
- **No centralized error/request logging** — no `morgan`/`pino`/`winston`, no Express error-handling middleware at the bottom of `index.ts`; only scattered `console.error` calls. No monitoring/alerting integration (Sentry etc.) of any kind.
- **No security-headers middleware** (`helmet` not installed) — no CSP, no `X-Frame-Options`.
- **Weak image upload validation** — `multer`'s `fileFilter` only checks `mimetype.startsWith('image/')`, which accepts `image/svg+xml`. SVGs can carry embedded scripts and are a known stored-XSS vector, and the Supabase bucket serving them is public. No magic-byte sniffing, no image-specific content moderation.
- **CORS is a single fixed origin** (`CLIENT_URL`) — fine for one deployed frontend, but no allow-list for multiple environments (staging + prod) without a redeploy.
- **Ownership checks are consistently present** everywhere a user-scoped resource is mutated — explicitly verified as *not* lacking, following a clean `findUnique → 404 if missing → 403 if not owner` idiom throughout `orders.ts`, `seller.ts`, `notifications.ts`.

### 5.4 Incomplete / Hardcoded Logic

- `PaymentStatus.refunded` — dead enum, no implementation (see 5.2).
- No Razorpay webhook handler — the most consequential gap in the payment flow.
- `CHECK_INTERVAL_MS = 5_000` (auction start/end poller) hardcoded, not env-configurable.
- `MAX_IMAGES = 6` / `MAX_IMAGE_BYTES = 5MB` hardcoded — inconsistent with the pattern used elsewhere (buyer premium %, seller commission % *are* admin-configurable via `PlatformSettings`) where business-tunable numbers are concerned.
- `SALT_ROUNDS = 10` hardcoded (reasonable default, just not configurable).
- Supabase bucket always created `public: true` — a fixed architectural choice, ties into the SVG/XSS point above.
- A couple of silent-failure catches with no logging: malformed `keepImages` JSON in `seller.ts` falls back silently; `deleteItemImages(...).catch(() => {})` in `seller.ts` swallows storage-cleanup failures with no trace, meaning orphaned Supabase objects on failure are invisible.

### 5.5 Server Patterns Worth Preserving

- **Derived state over duplicated state**: `withDisplayStatus()` computes `displayStatus`/`isReviewed` from existing `status`/`auction.status` fields rather than storing redundant flags — reused consistently across three route files.
- **Transactional integrity** around every multi-table state transition (item approval, auction start/end, seller-application approval, payment verification) — status change + notification + audit/payout row all commit atomically.
- **Race-safe scheduler**: the auction start/end poller re-verifies status/timestamps *inside* the transaction (not just at the initial query) specifically to handle a last-second bid extending the auction between poll and update — an explicitly-commented anti-snipe correctness detail.
- **Reuse over recomputation**: `GET /api/dashboard/overview` explicitly reuses the same Bid/Watchlist/Order queries other endpoints already run, per its own comment, rather than maintaining a separate counters table.
- **Consistent ownership-check idiom** across every buyer/seller-scoped mutation, making authorization easy to audit at a glance.

---

## 6. Client Audit

### 6.1 Full Page Inventory

| Page | Route | Purpose | Access |
|---|---|---|---|
| `Home.tsx` | `/` | Landing: hero, featured/live/upcoming rails, category grid | Public |
| `Browse.tsx` | `/browse` | Filterable/sortable lot browsing | Public |
| `Upcoming.tsx` | `/upcoming` | Not-yet-started auctions, live countdowns, Remind buttons | Public |
| `Archive.tsx` | `/archive` | Completed-lot public record, filterable/sortable | Public |
| `HowItWorks.tsx` | `/how-it-works` | Static explainer | Public |
| `ItemDetail.tsx` | `/items/:id` | Single-lot detail/bidding | Public (bidding requires login) |
| `LiveAuction.tsx` | (rendered by ItemDetail for live items) | Immersive live-bidding layout | Public/login-to-bid |
| `Legal.tsx` | `/legal/:slug` | Public legal-page rendering | Public |
| `Login.tsx` / `Signup.tsx` | `/login` / `/signup` | Auth forms | Public |
| `Orders.tsx` | `/orders` | Buyer's own orders | Any logged-in user (self-guarded, not `RequireRole`-wrapped) |
| `Dashboard.tsx` | `/dashboard` | Buyer KPI overview + tabs | Any logged-in user (self-guarded) |
| `Notifications.tsx` | `/notifications` | Full paginated notification history | Any logged-in user (self-guarded) |
| `Sell.tsx` | `/sell` | Seller application gate + submission wizard | `RequireRole(['buyer','seller','admin'])` |
| `MyListings.tsx` | `/my-listings` | Seller dashboard (listings/drafts/payouts) | `RequireRole(['buyer','seller','admin'])` |
| `admin/*` (10 pages) | `/admin/*` | Full back office | `RequireRole('admin')` at the layout level, covers all children |

### 6.2 Responsiveness Audit

**Overall signal** (breakpoint-class occurrence count per page, independently verified via grep across all page files):

- Genuinely responsive with real `sm:`/`md:`/`lg:` usage: `Home`, `Browse`, `Archive`, `Upcoming`, `Sell` (21 occurrences — the most responsive page in the app), `MyListings`, `Dashboard`, `LiveAuction`, `admin/Dashboard`.
- **Zero responsive breakpoints found**: `admin/AuditLog.tsx`, `admin/Categories.tsx`, `admin/Legal.tsx`, `admin/Orders.tsx`, `admin/Payouts.tsx`, `admin/Sellers.tsx`, `admin/Settings.tsx` — **7 of 10 admin pages**. `Login.tsx`, `Signup.tsx`, `Notifications.tsx` also show zero, but these are naturally-responsive single-column layouts, not broken ones.

**Concrete offenders:**

- **`admin/AdminLayout.tsx`**: below `md`, the 10-item sidebar nav becomes a horizontally-scrolling pill row with no hamburger/drawer — small tap targets, easy to mis-tap while scrolling. This is the root cause of every admin sub-page effectively being desktop-only in practice.
- **`admin/AuditLog.tsx`, `admin/Sellers.tsx`**: plain `<table>` in an `overflow-x-auto` wrapper with 4–6 columns and no card fallback for mobile — technically scrollable, but a poor phone experience with no affordance that more columns exist off-screen.
- **`admin/SellerApplications.tsx`**: its approve/reject button row has no `flex-wrap` (unlike the equivalent row in `admin/Approvals.tsx`, which does) — buttons can be squeezed against a long applicant name on narrow screens.
- **`Header.tsx`**: the secondary nav (Categories, Upcoming, Archive, How It Works) is `hidden ... lg:block` — invisible on tablet widths (768–1023px) except via the mobile hamburger drawer. By design, but worth knowing.

**Verdict**: the public-facing buyer/seller experience is solidly responsive across phone/tablet/desktop. The admin back office is functionally desktop-only — acceptable for an internal tool used by staff at a desk, but explicitly worth deciding on as a product choice rather than an oversight.

### 6.3 Duplicate Code / Reuse Opportunities

Concrete, repeated patterns not yet extracted into shared components:

- **Admin "queue card" shell** duplicated across `admin/Approvals.tsx`, `admin/SellerApplications.tsx`, `admin/Orders.tsx`, `admin/Payouts.tsx` — same card wrapper, header row, and fact-row grid hand-rolled four times.
- **Empty-state markup** (`rounded-xl border ... py-16 text-center` + heading + body) copy-pasted ~10 times across admin pages, `MyListings`, `Upcoming`, `OrdersPanel`.
- **"Loading…" and inline-error `<p>` patterns** each repeated ~15 times verbatim across nearly every page that fetches data.
- **Status-pill/badge logic re-implemented locally** in `admin/Sellers.tsx` and `MyListings.tsx` instead of reusing the already-centralized `ItemStatusBadge`/`OrderStatus` components — two sources of visual truth for what should be one.
- **Shipping-status option list duplicated**: `admin/Orders.tsx`'s `SHIPPING_OPTIONS` fully duplicates `OrderStatus.tsx`'s `SHIPPING_STEPS` (same 4 values/labels, different array, manually kept in sync).
- **Approve/Reject flow duplicated** between `admin/Approvals.tsx` and `admin/SellerApplications.tsx` — near-identical `busyId` state + `window.prompt` reason-capture + list-filtering logic implemented twice.
- **Payout gross/commission/net breakdown grid** implemented independently in `admin/Payouts.tsx` and `MyListings.tsx`'s seller payout view.
- **`getMySellerApplication` fetched independently** in both `Header.tsx` and `Sell.tsx` on mount — duplicate network call and duplicate state for the same data, unlike the existing `WatchlistProvider`/`RemindersProvider`/`NotificationProvider` context pattern which already solves this problem elsewhere in the app.

### 6.4 Auth / Role-Guard Completeness

- Every `/admin/*` route is correctly protected in aggregate — `RequireRole role="admin"` wraps `AdminLayout`, and all 10 admin children render through its `<Outlet/>`, so there is no way to reach an admin page without the guard.
- `/sell` and `/my-listings` are correctly wrapped in `RequireRole(['buyer','seller','admin'])`.
- **`/orders`, `/dashboard`, `/notifications` are not wrapped in `RequireRole`** — each instead self-guards in-component with `if (!user) return <Navigate to="/login" replace />`. This is **not a security hole** (no data fetch happens before the check, and every real API call requires a token), but it's an inconsistency: three different pages hand-roll the same guard that a shared component already exists for, which is both minor duplication and a risk if a future page is added to this trio without remembering the pattern.
- No route was found to be under-protected in a way that leaks admin/seller data client-side.

### 6.5 Missing States / Rough Edges

- **Native `window.prompt`/`window.confirm`** used for reject-reason capture and delete confirmation in `admin/Approvals.tsx`, `admin/SellerApplications.tsx`, `admin/Categories.tsx` — unstyled, inconsistent with the rest of the app's design, no validation feedback, no length limits.
- **Raw `err.message` surfaced directly to users** in ~15+ places across admin and buyer pages — safe today only insofar as the API always returns clean error strings, which is a fragile assumption to build UX on long-term.
- **No pagination on most admin lists** — `Sellers`, `Orders`, `Payouts`, `AuditLog`, `Categories`, `Approvals`, `SellerApplications` all fetch and render the *entire* result set with no `page`/`limit`. Only `Notifications.tsx` implements real pagination. `AuditLog` and `Orders` in particular will become real performance/usability problems at production scale.
- **No forgot-password link** on `Login.tsx`, and no email-verification UI anywhere (consistent with the server-side gaps in §5.3).
- **No image lightbox/zoom** on item photos anywhere in the wizard review step or (per earlier work in this codebase) the item detail gallery — a meaningful gap for a platform selling rare coins/antiques where surface detail matters to buyers.
- **`admin/Legal.tsx`** is a raw textarea with a hand-rolled pseudo-markdown convention, no live preview, and an explicit in-app disclaimer that its own content is unreviewed boilerplate, not vetted legal copy — a business/compliance risk, not just a UI one.
- **`Header.tsx`'s seller-approved state defaults to `true`** before the async check resolves, briefly showing "Sell an Item" instead of "Apply to Sell" for a new, unapproved user — a minor but real incorrect-state flash.

### 6.6 Client Patterns Worth Preserving

- **URL-searchParams-as-filter-state** in `Browse.tsx`/`Archive.tsx` — shareable, bookmarkable, back-button-friendly filtered URLs, with debounced search.
- **Context-provider layering** (`AuthProvider → WatchlistProvider → RemindersProvider → NotificationProvider`) with a consistent optimistic-update-then-reconcile pattern.
- **Socket-driven live notifications** via a single shared socket singleton with a clean `identify`/`unidentify` handshake tied to auth state.
- **The `Sell.tsx` wizard**: per-step validation gating, a progress bar, draft-save-at-any-step, proper object-URL cleanup for image previews, and a full review-before-submit step — the most polished form flow in the app.
- **Consistent visual language** for loading/empty/error states across nearly every page, even though the markup itself should be extracted (§6.3) — the design consistency achieved is real.
- **Payout transparency**: sellers see the same gross/commission/net breakdown language admins see, building trust in how payouts are calculated.

---

## 7. Cross-Cutting Findings

- **No automated tests anywhere** — every feature in this app has so far been verified by hand (curl scripts + Playwright screenshots per session, not committed to the repo). This is the single biggest structural risk for an app handling real money: bid-placement concurrency, payment verification, and role-gating are exactly the kind of logic that should have regression tests before more features are layered on.
- **No CI/CD** — no automated type-check/lint/build/test gate on push, no `.github/workflows`. Given both `tsc --noEmit` (server) and `tsc -b` (client) are already fast, clean, and used manually every session, wiring them into CI is low-effort, high-value.
- **Duplicate-source-of-truth risk** shows up in a few places (shipping-status option lists, status-pill styling, seller-application fetch) — none are bugs today, but each is a place where the two copies can silently drift.
- **The admin surface and the buyer/seller surface have visibly different levels of polish** — buyer/seller pages use shared components and consistent empty/loading states; admin pages largely hand-roll the same patterns per-page. This is the natural result of admin tooling being built faster/leaner, and is the right place to invest in shared components next.

---

## 8. Missing Functionality for a Production-Ready Auction Platform

Ranked by how directly they block a real (non-demo) launch:

1. **Buyer shipping address collection** — currently absent from the data model entirely. Nothing can physically ship without this.
2. **Payment webhook + reconciliation** — client-only payment confirmation is a real money-handling gap.
3. **Refund flow** — the schema already anticipates it (`refunded` enum value); no implementation exists.
4. **Legal content review** — the platform's own admin editor disclaims its content as unreviewed; real ToS/privacy/auction-terms copy needs actual legal sign-off before real transactions happen on it.
5. **Tax/invoicing (GST)** — no tax model, no invoice generation, for a platform that will need GST-compliant billing in India.
6. **Automated tests** — at minimum, coverage of bid concurrency, payment verification, and auth/role gating.
7. **Email verification & password reset** — both entirely absent.
8. **Email (or SMS) notifications** — currently in-app/Socket.io only; a user who isn't on the site when they're outbid or win will simply never know until they log back in.
9. **Payment/error monitoring** — no logging framework, no error-tracking integration (e.g. Sentry), no alerting.
10. **Rate limiting beyond auth/bids** — image upload and admin mutation endpoints are currently unthrottled.
11. **Pagination on admin lists** — will degrade badly at real-world data volumes.
12. **Server-side search** — Browse's search is a client-side title substring filter over the already-fetched page of results, not a real search endpoint; won't scale past a small catalog.
13. **Admin mobile responsiveness** — a product decision to make explicitly, not by default.
14. **SEO** — no per-item meta/Open Graph tags, pure client-rendered SPA; matters if organic/social discovery of listings is a growth channel.

---

## 9. Recommended Development Roadmap

Phased for incremental delivery — each phase is independently shippable and none require touching the core architecture.

### Phase 0 — Pre-launch blockers (must-have before handling real transactions)
- Add shipping-address collection to the data model + checkout/order flow (buyer-entered, editable, visible to seller/admin)
- Razorpay webhook endpoint with signature verification, idempotent reconciliation against `verify-payment`
- Real legal review + replace placeholder legal copy
- GST/tax handling and basic invoice generation for paid orders
- Minimal automated test suite: bid-placement concurrency, payment verification, auth/role gating (the highest-risk logic in the app)
- Security hardening pass: `helmet`, reject/sanitize SVG uploads, broaden rate limiting to cover uploads and admin mutations, add centralized error logging + an error-tracking integration

### Phase 1 — Account & trust essentials
- Email verification on signup
- Password-reset flow
- Case-insensitive email normalization
- Refund flow (implement the already-modeled `refunded` state end-to-end)
- Email notifications for time-sensitive events (outbid, won, payment due, shipping updates) alongside the existing in-app ones

### Phase 2 — Scale & admin operability
- Pagination on every admin list endpoint + page (audit log, orders, payouts, sellers, categories, approval queues)
- Server-side search for Browse/Archive
- Replace `window.prompt`/`window.confirm` in admin flows with a proper modal component
- CI pipeline: type-check + lint + (new) test suite on every push, using the existing `tsc --noEmit` / `tsc -b` commands as the base

### Phase 3 — Code quality & polish
- Extract the identified duplicated UI primitives: `EmptyState`, `Loading`, `InlineError`, `AdminEntityCard`/fact-row grid, a shared `Pill`/`Badge`, `PayoutBreakdown`
- Consolidate `Dashboard`/`Orders`/`Notifications` onto `RequireRole` for consistency with the rest of the app's route guarding
- Unify the shipping-status option list (`OrderStatus.tsx` vs `admin/Orders.tsx`) into one source of truth
- Lift the duplicated `getMySellerApplication` fetch (`Header.tsx` + `Sell.tsx`) into the existing context-provider pattern
- Image lightbox/zoom on item detail photography
- Decide explicitly on admin-panel mobile support; if yes, give `AdminLayout`'s nav a real mobile drawer to match the pattern already used in the main `Header`

### Phase 4 — Growth
- SEO pass: per-item meta/Open Graph tags, consider prerendering/SSR for public item and browse pages
- Accessibility pass: `aria-live` regions on async form errors, alt-text audit, keyboard-navigation audit
- JWT refresh/session-management improvements (shorter-lived access token + refresh flow) if session security becomes a priority
- Multi-environment CORS allow-list (staging + prod) if a staging environment is introduced

---

## 10. Closing Note

Nothing in this audit calls for discarding existing work. The transaction-critical logic (bidding, payments, payouts, moderation) is already careful and well-tested by hand across many sessions; the gaps are concentrated in exactly the areas you'd expect from an MVP built for functional completeness first — operational hardening (tests, monitoring, webhooks), a couple of real-world data-model gaps (shipping address, tax), and UI polish (admin responsiveness, duplicate component extraction). Phase 0 is the meaningful gate between "impressive demo" and "can safely take a stranger's money for a physical object" — everything after that is refinement.

---

## 11. 2026-09-01 Follow-up Check-In

**Scope:** re-verification of everything §8's roadmap has since shipped (shipping address, security hardening, password reset, admin refund flow — all landed the same day as the original audit, a few hours after it was written) plus fresh review of what's shipped since (the Razorpay webhook, the Vitest test suite, the parametric emblem system, the header/sub-header reorganization, the database-recovery incident and its fix, and the 22-item catalog re-seed). Every claim below was independently re-verified against the running app and/or the current code — nothing here is carried forward on trust from the earlier write-up.

### 11.1 Regression spot-checks — everything still holds

All confirmed via live requests against the running server (not just code reading), using a mix of real registered accounts and directly-inserted test users (to avoid `authLimiter`, exhausted mid-session from repeated setup runs — itself a small confirmation that rate limiting works):

- **Shipping address requirement** — `POST /:id/create-payment` still correctly 400s ("Please add a shipping address before proceeding to payment.") until `PATCH /:id/shipping-address` has been called; succeeds immediately after. No regression.
- **Security hardening (`helmet`)** — confirmed present on a live response: `x-content-type-options: nosniff`, `x-dns-prefetch-control: off`, `strict-transport-security: max-age=31536000; includeSubDomains`, and `x-powered-by` correctly absent. No regression.
- **Password reset** — full live round trip: `forgot-password` → real token → `reset-password` → login with the *old* password now fails (401), login with the *new* password succeeds (200), and reusing the same reset token a second time is correctly rejected ("invalid or expired"). No regression.
- **Razorpay webhook** — replaying `payment.captured` for an order already marked paid (via a normal `verify-payment` call) is confirmed idempotent: still `200`, still exactly one `Payout` row, no duplicate. A tampered signature is still rejected with `400`. No regression — this is the same suite of checks run when the webhook was first built, re-run cold against the current code.
- **Admin refund flow** — pre-flight logic confirmed correct live (payment-status check, `razorpayPaymentId`-presence check, ownership). The actual `getRazorpay().payments.refund()` call was **not** independently re-verified end-to-end this pass: it requires a genuinely captured real Razorpay payment to refund, and every payment in this environment's demo/test data is a synthetic `pay_test_…`/`pay_checkin_…` id (valid for signature-verification tests, which don't call Razorpay's API, but not for a real refund, which does). Attempting it against a synthetic id correctly fails at Razorpay's API boundary — and, importantly, **the order's DB state stayed exactly `paid` with no partial refund fields set** afterward, confirming the route's "call Razorpay first, only commit the DB transaction if that succeeds" ordering is working as designed even on failure. Code review of the full route found no logic regression.
- **Test suite** — `npm test` run cold: **16/16 passing**, ~52s, no flakes across the run. `public` schema row counts confirmed identical before and after (the `resetDatabase()` safety guard from the incident fix is doing its job in normal use, not just under the direct test I ran for it separately).

### 11.2 One real finding from this pass (minor, not a regression)

Testing the refund route against a synthetic payment id surfaced a genuine small gap: the app-wide error handler (`index.ts`) does `err instanceof Error ? err.message : String(err)`. The Razorpay SDK throws a plain object (not an `Error` instance) on an API rejection, and `String({...})` produces the literal string `[object Object]` — which is exactly what landed in the server log for this failure, with zero diagnostic detail about what Razorpay actually rejected. Worth swapping the fallback to `JSON.stringify(err)` (or checking for the SDK's own error shape) so a *real* refund failure in production is actually debuggable from the log alone.

### 11.3 Code quality — webhook, test suite, header (fresh read, no prior findings to compare against)

- **`webhooks.ts` / `orderPayment.ts`** — reread end to end, no issues found. Signature verification, idempotency, and logging are all exactly as they were when built and verified.
- **Test suite structure** — clean overall. One small nit: `tests/helpers.ts`'s `createUser()` hand-types its `sellerStatus` parameter as a literal union (`'none' | 'pending' | 'approved' | 'rejected'`) instead of importing the `SellerStatus` type from `@prisma/client` — which is already imported one line above for `Role`, driving the same function. Harmless today, but it's a second, hand-maintained copy of an enum that already exists once; if `SellerStatus` ever gains/loses a value, this string union silently drifts out of sync instead of failing to compile.
- **`Header.tsx`** — now 485 lines across 8 sub-components (`BrowseDropdown`, `CategoriesDropdown`, `AccountMenu`, `SearchToggle`, `MobileMenu`, etc.) after several rounds of edits. Not broken — it's still one cohesive, readable file — but it's grown to the point where splitting the dropdown/menu sub-components into their own files would be a reasonable next housekeeping pass if it grows further. More concretely worth flagging: the `min-[900px]:` custom Tailwind breakpoint (introduced to fit the single-row nav into the 768–899px zone) is repeated as a literal arbitrary value **7 times** across the file. It's correct everywhere it's used, but it's a magic number with no single source of truth — a named `@theme` breakpoint token (e.g. `--breakpoint-nav-wide: 900px`, used as `nav-wide:`) would consolidate all seven into one place.
- **Pre-existing duplication, reconfirmed unchanged**: the `getMySellerApplication` double-fetch called out in §6.3 (once in `Header.tsx`, once in `Sell.tsx`, independently, on mount) is still present exactly as documented — the header rework changed *how* the fetched value is used (fixing the flash-bug default), not *whether* it's fetched twice. Still a good Phase 3 candidate.

### 11.4 New cross-cutting finding (not present in the original audit)

`Emblem.tsx` (the parametric illustration system, new since the original audit) defines its own local color constants — `ROYAL = '#173B70'`, `GOLD = '#C9A227'`, `CHAMPAGNE = '#DDBE63'` — which are exact hex duplicates of `--color-royal` / `--color-gold` / `--color-champagne`, already defined once in `client/src/index.css`. This is a real (if minor) second source of truth for the brand palette: necessary in the sense that raw SVG `stroke`/`fill` attributes can't consume Tailwind utility classes directly, but the SVG *could* reference the existing CSS custom properties directly (`stroke="var(--color-royal)"`) instead of re-declaring the hex values — if the palette is ever retouched, today it would need to change in two places to stay in sync, and nothing would flag the mismatch if only one got updated.

### 11.5 The "not yet done" list (§8) — reconfirmed, one correction, nothing newly urgent

Every item re-checked directly against current code (`grep` for email-sending libraries, tax/GST references, `page`/`limit`/`skip`/`take` on admin routes, meta/OG tags) rather than assumed unchanged:

- **Items 1–4, 6–11, 13–14 (shipping/webhook/refund/legal-review/tests/email/monitoring/rate-limiting/pagination/admin-mobile/SEO)**: shipping, webhook, refund, and the test suite are now *done* (see §11.1 and the earlier phases that built them) — §8's numbering predates that work and should be read against the current commit history, not literally. Everything else on the list (GST/tax, real legal sign-off, email/SMS notifications, error monitoring/Sentry, rate limiting beyond auth/bids, admin list pagination, SEO) is **still fully absent**, confirmed by direct search, not by assumption.
- **One correction to item 12 ("server-side search")**: this was always only true for Browse/`GET /api/items`, which still does client-side substring filtering over an already-fetched page (`Browse.tsx`'s `searchedItems` `useMemo`) — confirmed unchanged. But **`GET /api/archive` already implements real server-side search** (`where.title = { contains: search, mode: 'insensitive' }`) and always has. This wasn't wrong in the original audit (it was scoped to Browse specifically), but it's worth stating explicitly now: the pattern to copy for Browse already exists once in this same codebase, this isn't new work to design from scratch.
- **Nothing on the list has become more urgent.** Admin data volumes are still small in absolute terms (`AdminAction` sits at single digits after this session's cleanup; the catalog is 29 items) — pagination remains a real structural gap but not yet a practical one. The one item that's marginally strengthened by recent work: the catalog now holds genuine, specific, real descriptive content (the 22-item numismatic catalog) rather than sparse placeholder data, which makes the SEO gap (item 14) slightly more concretely worth doing than when the audit was written against a near-empty catalog — still not urgent, just less abstract.

### 11.6 Data hygiene found and fixed during this check-in (not a code issue)

While reviewing the real catalog's rendering, one item ("British India, Uniface, George V, 10 Rupees…") showed a fully blank white card in Browse. Traced to a real (not broken/404) but visually blank uploaded photo on a leftover test listing — a seller account (`emma@yopmail.com`, one item, zero orders) left over from ad-hoc testing earlier in this project's session history and never cleaned up. Removed, along with several other leftover test accounts discovered in the same sweep (from this check-in's own verification scripts, and one pair left over from the prior header-reorg session's rate-limit-retry). Confirmed clean afterward: exactly the 2 intentional demo sellers (Kohinoor Numismatics, Heritage Coins & Currency) + 3 intentional demo bidders (from the catalog re-seed) + 1 admin = 6 real users, no stray test data, `public` schema counts otherwise undisturbed.

### 11.7 Summary

No regressions found in anything previously shipped. Two small, genuinely new, low-urgency findings (the `[object Object]` error-logging gap, the `Emblem.tsx` color-constant duplication) plus two pre-existing ones reconfirmed unchanged (`getMySellerApplication` double-fetch, `SellerStatus` type duplication in tests). The "not yet done" list from §8 is accurate as originally scoped, with one clarifying correction (Archive already has server-side search; Browse still doesn't) and no items that have become newly urgent. The one actual issue found and fixed this pass was data hygiene (a stray test listing visible in the live catalog), not application code.
