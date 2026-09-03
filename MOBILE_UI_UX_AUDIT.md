# Mudra House Mobile — UI/UX Design Audit

**Conducted:** 2026-09-02, as a design review of the running mobile app (Expo web output, driven with Playwright at a 390×844 mobile viewport — iPhone-sized — since no simulator-automation tool is available in this environment). Every finding below is anchored to an actual screenshot of the real app, signed in as a real test account, showing real catalog data pulled from the same database the web app uses. Nothing was fixed as part of this pass — this is findings only, matching the brief.

All referenced screenshots live in `mobile-ux-audit-screenshots/` at the repo root (16 files). Test accounts used to reach gated screens were deleted afterward.

---

## The one thing to answer first: does this app use Mudra House's actual brand identity?

**Colors: mostly yes. Typography: no, not at all, on any screen, in any of the seven phases built so far.**

This needs to be said plainly because it's the single biggest gap in the app, and it's easy to miss if you only skim screenshots quickly — the color palette is close enough that the app doesn't look *broken*, just generic. Here's the direct comparison, against `client/src/index.css`'s `@theme` block (the actual source of truth for the brand):

```css
--color-royal: #173b70;
--color-deepblue: #234f8c;
--color-gold: #c9a227;
--color-champagne: #ddbe63;
--color-ivory: #faf9f5;
--color-charcoal: #20242a;
--color-green: #16855b;
--color-red: #c83b3b;

--font-display: "Newsreader", serif;
--font-body: "Inter", sans-serif;
--font-mono: "IBM Plex Mono", monospace;
```

**Colors — `mobile/constants/colors.ts`:**

```ts
export const colors = {
  royal: '#173B70',
  deepblue: '#234F8C',
  gold: '#C9A227',
  ivory: '#FAF9F5',
  charcoal: '#20242A',
  red: '#C83B3B',
  gray: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
}
```

Royal, deepblue, gold, ivory, charcoal, and red are exact hex-for-hex matches. That part was done correctly and has held up consistently across all seven phases — genuinely good news, and worth saying clearly rather than burying under the typography problem below.

But two things are missing or wrong:
- **`champagne` (`#DDBE63`) doesn't exist on mobile at all.** Nothing currently needs it badly enough to be a real problem, but it means the palette isn't fully ported.
- **`green` doesn't exist as a shared constant, and every screen that needs a "success" color invented its own approximation instead of using the real `#16855B`.** `'#1a9550'` / `'rgba(34,164,90,...)'` appears hardcoded, independently, in six different files: `components/PaymentStatusPill.tsx`, `components/ItemStatusPill.tsx`, `app/sell-item.tsx`, `app/pay/[orderId].tsx`, and `app/live/[id].tsx`. It's a plausible-looking green, close enough that nobody would flag it in isolation, but it is not the brand's green, and it's duplicated six times instead of living in `colors.ts` once — the exact same class of problem this codebase already fixed once before, for `Emblem.tsx`'s color palette, on the web side.

**Typography — this is the real finding.** Search the entire mobile project for any use of `Newsreader`, `IBM Plex Mono`, `useFonts`, or `Font.loadAsync`, and the answer is zero hits, everywhere, across every phase:

```
$ grep -rn "expo-font\|useFonts\|Newsreader\|IBM Plex\|fontFamily" --include="*.tsx" --include="*.ts" .
(no matches outside package.json's dependency listing)

$ find mobile/assets -iname "*.ttf" -o -iname "*.otf"
(no results)
```

`expo-font` is present in `package.json`, but only as a transitive dependency other Expo packages pull in — it is never imported or called anywhere in this app's own code. `app/_layout.tsx` — the one place a font-loading gate would live — doesn't reference fonts at all. **Every screen, in every phase, renders in whatever the OS's default system font is** (San Francisco on iOS, Roboto on Android, the system UI font on web) — not Newsreader, not Inter, and not IBM Plex Mono.

The practical effect, visible on every single screenshot in this audit:
- Every heading that on web is set in Newsreader — a serif display face doing real work establishing the "auction house" feel (`login.png`'s "Log In", `home.png`'s "Discover History. Own Rarity.", `item-detail.png`'s title) — is instead bold system sans-serif. Compare `login.png` here against the web app's actual login page: same layout, same colors, completely different personality.
- **The "lot ticket" numeric style — IBM Plex Mono for every price, bid amount, and uppercase label — doesn't exist on mobile at all.** This is arguably the single most recognizable piece of the web app's identity (`STARTING BID` in small tracked mono caps, followed by a large mono `₹4,500`), used on literally every price anywhere on web. On mobile, every price in `home.png`, `auctions.png`, `item-detail.png`, `live-auction.png`, `my-orders.png`, and `my-listings.png` renders in the same proportional system font as the rest of the UI — functionally correct, visually indistinguishable from a generic to-do app showing a number.

**Bottom line:** if you handed someone `home.png` from this audit next to a screenshot of a random other React Native starter app with the same color values swapped in, they could not tell from the typography alone that this is Mudra House. The color work means it's not *unbranded*, but it is not *finished* — this is a real, fixable, and by far the highest-leverage single fix available (see P0 below): loading three font files and wiring `fontFamily` into the existing shared style patterns (`colors.ts` already proves the team knows how to centralize a design token once — the same move works for fonts).

---

## Findings by screen

### Login (`login.png`) / Sign Up (`signup.png`)

- Clean, minimal, correctly centered — no complaints on layout. Both forms are structurally identical to each other, which is good consistency.
- Both read as generic auth-form UI rather than Mudra House's — entirely a typography problem (see above), nothing else wrong here.
- Sign Up's Buy/Sell role picker (two side-by-side cards, active one gets a royal border + tinted background) is a nice, clear pattern — better than a plain radio pair.

### Home (`home.png`)

- Featured Lots section renders real catalog data correctly: category label, title, status pill, price, countdown. Good information density for a card at this width — nothing feels cramped.
- The category thumb (a colored box with the category's first letter) is a deliberately simple placeholder per Phase 2's own scope, not a bug — but next to fully-generic system-font text, the combination reads more like a wireframe than a finished screen. Once typography is fixed, this will likely read as "intentionally minimal" rather than "unfinished."
- Status pills (LIVE / UPCOMING) use the correct real royal/red-tinted colors and read clearly at small size.

### Auctions — plain (`auctions.png`), Filters open (`auctions-filters-open.png`), Filters expanded (`auctions-filters-expanded.png`)

- This is the most data-dense screen in the app, and it holds up well: search box, Filters button with a live active-count badge, Sort button, a result-count line that echoes the search term back, then the list. Nothing here feels overwhelming despite covering search + 8 filter dimensions + sort.
- The Filters modal itself is genuinely well-organized: Status pills and Category checkboxes (with per-category counts, a nice touch not even on the equivalent web sidebar's mobile drawer) stay always-visible since they're reached for first, while Year/Material/Condition/Grade collapse behind chevron rows — exactly the "possibly collapsible sections" the brief asked for, and it visibly prevents the modal from feeling like a wall of controls.
- Expanded Year section (`auctions-filters-expanded.png`) shows 26 year chips wrapped across many rows with no visible "26 years" affordance — functional, but on a real device this is a lot of vertical scrolling to find one specific year. Not broken, just worth a second look if the catalog's year range grows further.
- Same font problem as everywhere: "All Auctions", "Filters", section labels like "STATUS"/"CATEGORY" — all system font where web uses a mix of Newsreader (page title) and tracked mono-caps (section labels). The filter chips themselves (pill-shaped, royal-filled when active) are visually consistent with the Sell an Item screen's category chips and the Live Auction status badge — genuinely one coherent interaction pattern reused well across three different phases, which is worth calling out as a real strength independent of the type problem.

### Item Detail (`item-detail.png`)

- The native screen header ("10 Naye Paise, 1957 Decimal Series", top of screen) is plain black-on-white — completely unstyled, no royal blue, no brand presence at all — sitting directly above a page that *is* correctly colored (royal heading, royal price, gray labels). This is a real, visible seam: the chrome and the content look like they belong to two different apps. See "Cross-cutting" below — this isn't unique to this screen.
- Below the header, the actual content is well done: status pill, price box with the correct "Sold For"/label logic from Phase 2/6's work, then a clean label/value spec table. Good hierarchy, nothing crowded.
- The category-thumb placeholder image fills a full-width hero block here — proportionally larger than on the card view, which makes its simplicity more noticeable. This is the screen where investing in the "later phase" full illustration/emblem system (mentioned in earlier phases as explicitly out of scope) would pay off the most.

### Live Auction (`live-auction.png`)

- The dark navy background here is *intentional* and *correct* — it mirrors the web app's own immersive dark hero treatment for live bidding specifically (confirmed against `client/src/pages/LiveAuction.tsx`'s `bg-gradient-to-b from-[#0b1f42] to-royal`). This is the one screen that's supposed to look different from the rest of the ivory-background app, so don't mistake this for an inconsistency — it's the single screen where mobile is most deliberately trying to match web's specific design intent, and it mostly succeeds: LIVE badge, gold current-bid figure, the three-stat row (Current Bid / Time Left / Active Bidders), gold Place Bid button.
- This is also the *one* screen where the native header got custom styling (`headerStyle: { backgroundColor: colors.royal }` in `app/live/[id].tsx`) — which only makes the other seven headerShown screens' plain default headers stand out more by comparison; it proves the fix is trivial (one line already exists to copy) rather than hard.
- Still no mono font on "CURRENT BID ₹8,000" / "TIME LEFT 36h 52m" — this is exactly the screen where web's lot-ticket mono styling matters most (anti-snipe timing, at-a-glance bid amounts), and it's completely absent.

### Watchlist — loading (`watchlist-loading.png`), empty (`watchlist.png`)

- The empty state itself is well-written and correctly styled ("Your watchlist is empty" / "Tap the heart on any lot to save it here.").
- **Real, measured issue, not a screenshot-timing artifact:** the loading spinner on this specific tab's first visit after login persists for roughly 3–4 seconds before resolving — noticeably slower than every other tab, confirmed by polling the DOM every second across a fresh run rather than relying on a single screenshot's timing. Home, Auctions, and Notifications all resolve in under 1.5s on the same connection. Worth profiling `getWatchlist`'s round trip specifically.

### Notifications (`notifications.png`)

- Clean, correctly styled empty state, consistent with Watchlist's. No issues.

### Profile (`profile.png`)

- Best-organized screen in the app for information density: greeting, email, role, then two clearly separated cards (Orders, Selling) each with their own single clear CTA, then Log Out. No competing hierarchy, nothing crowded — this is the screen I'd point to as the template for how the rest of the app's cards should feel once the font is fixed.
- The two-card layout (white bordered card, small gray section label above in caps) is the same pattern used for My Listings' and My Orders' individual rows — good reuse.

### Apply to Sell (`apply-to-sell.png`)

- Same unstyled native-header problem as Item Detail (black "Apply to Sell" text on plain white, above a correctly royal-blue "Apply to Sell" heading one scroll-length below it — two different-looking headings for the same page).
- The form itself is clean and correctly sequenced (personal info → address → a visually distinct "PAYOUT DETAILS" sub-section in tracked mono-caps, matching the style convention used for section labels elsewhere). No complaints on the form's own layout.

### Sell an Item (`sell-item.png`)

- The category picker as a horizontal scrolling chip row (royal-filled when selected) is a good mobile-appropriate translation of the web wizard's step-1 dropdown — arguably better for touch than a `<select>` would be.
- Field density here is high (the whole web wizard's step 2 collapsed into one screen, by design per the brief) but it doesn't feel unmanageable — two-column pairing (Year/Denomination, Mint/Ruler-Authority, etc.) keeps related short fields from each eating a full row, and section labels ("ITEM DETAILS", "PHOTOS (UP TO 6)") give clear scan-points while scrolling.
- Consistent unstyled-header issue again ("Sell an Item" plain black text at top).

### My Listings (`my-listings.png`)

- **The one genuinely unpleasant thing found in this whole audit.** A signed-in buyer who isn't an approved seller yet and navigates to this route directly (a very reachable state — nothing prevents it client-side) sees a raw, unstyled red error string: **"Insufficient permissions."** No heading context beyond the plain native-header "My Listings," no explanation, no link back, nothing telling the user this is expected because they haven't applied to sell yet. Contrast this with Watchlist/Notifications' actually-designed empty states two tabs over — this is the one place in the app that looks like a server error leaked directly into the UI, because that's exactly what happened (this is `GET /api/seller/items`'s literal 403 message, unwrapped and shown verbatim). Worth a proper gate state here, matching the quality bar the rest of the app already sets.

### My Orders (`my-orders.png`)

- Clean, correctly styled empty state ("No orders yet" / "Win an auction and it'll show up here."), consistent with Watchlist and Notifications' pattern. Good — three different tabs independently arrived at the same well-designed empty-state convention (icon-less, bold royal heading, one line of gray explanatory text), which speaks well of the app's underlying consistency even without a shared `EmptyState` component backing it.

---

## Cross-cutting findings (not tied to one screen)

- **Native screen headers are inconsistent across the app, and it's the most visible "does this feel like one coherent app" problem found.** Every pushed/modal screen that sets `headerShown: true` — `items/[id]`, `apply-to-sell`, `sell-item`, `my-listings`, `my-orders`, `pay/[orderId]`, and `live/[id]`'s own initial-load state — uses React Navigation's plain default header (white background, black system-font text). Only `live/[id]`'s fully-loaded live-auction render sets a custom `headerStyle`. Since the header sits directly above content that *is* correctly royal/ivory/branded, every one of those seven screens visually reads as two different apps stacked on top of each other. This is cheap to fix everywhere at once (a shared `screenOptions` default in the relevant `Stack` configs, one time) and would do more for "feels like one coherent app" than almost anything else on this list.
- **No pull-to-refresh anywhere.** Every list (`Home`, `Auctions`, `Watchlist`, `Notifications`, `My Listings`, `My Orders`) relies solely on `useFocusEffect` refetching on tab focus — there's no `RefreshControl`/`onRefresh` on a single `FlatList` or `ScrollView` in the app (confirmed by grep: zero matches). This is one of the most standard native list conventions on both iOS and Android, and its total absence is one of the clearer "this still feels like a shrunk website" signals, independent of the type/color work — a user pulling down on any list here gets no response at all.
- **Some touch targets are under the recommended minimum.** The watchlist heart button (`components/WatchlistButton.tsx`) is a 30×30 hit area; Apple's HIG and Android's Material guidance both recommend 44×44pt / 48×48dp minimums for a reliably tappable target, especially one sitting at a card's corner where mis-taps are easy. It has an 8px `hitSlop`, which helps but doesn't fully close the gap (effective ~46×46, right at the edge, and only on native — `hitSlop` has no effect on web).
- **Safe-area handling was never explicitly implemented.** `react-native-safe-area-context` is installed (a standard Expo Router dependency) but `useSafeAreaInsets`/`SafeAreaView` are never referenced anywhere in `app/` or `components/`. React Navigation's own Stack/Tabs chrome generally handles this automatically, so this likely isn't visible in practice for most screens — but the two custom full-screen `<Modal>`s (Filters, Sort) render their own content without any explicit inset handling, which is worth a real on-device check (not verifiable from Expo web) on a notched/Dynamic-Island phone, since a modal's own header/footer are exactly the kind of custom chrome that can end up under a notch if a navigator isn't managing it.
- **Genuine consistency win, stated plainly so it isn't lost under the rest of this list:** the shared component set — `ItemCard`, `StatusPill`, `ItemStatusPill`, `PaymentStatusPill`, the pill/chip visual language, the white-bordered-card-with-gray-caption-label pattern — is reused correctly and consistently from Phase 2 straight through Phase 7. Spacing, border radius, border color, and card padding all match screen to screen. If the only thing fixed from this audit were typography, the app would likely read as convincingly on-brand almost immediately, because the structural bones underneath are already consistent.

---

## Prioritized findings

**P0 — the fix that changes everything else's perception**
1. **Load the real brand fonts (Newsreader, Inter, IBM Plex Mono) via `expo-font`/`useFonts` in `app/_layout.tsx`, and wire `fontFamily` into the existing shared style patterns** — this single change touches every screenshot in this audit and is the difference between "generic app with the right colors" and "Mudra House." Given `colors.ts` already exists as a single shared source, the natural move is a matching `constants/fonts.ts` (display/body/mono) referenced the same way.
2. **Apply the resulting mono font specifically to every price/bid/count value and its uppercase label** (`ItemCard`, Item Detail, Live Auction's stat row, My Orders, My Listings) to actually reproduce the "lot ticket" look — this is a font-family change on top of fix #1, not a new design, since the layout/sizing/spacing for these values is already close to web's.

**P1 — small effort, real "does this feel coherent" payoff**
3. Give every `headerShown: true` screen a consistent branded header style (at minimum: ivory/white background, royal title text — or copy `live/[id]`'s live-state `headerStyle` pattern) instead of the default. Seven screens, one shared fix.
4. Fix My Listings' raw "Insufficient permissions" string for a non-seller visiting directly — replace with a real gate state matching the quality of Watchlist/Notifications/My Orders' existing empty states.
5. Centralize the green success color into `colors.ts` as `colors.green: '#16855B'` (the real brand value) and replace the six independently-hardcoded `'#1a9550'`/`rgba(34,164,90,...)` occurrences.

**P2 — real, but lower urgency**
6. Add `RefreshControl`/pull-to-refresh to the six lists that currently only refetch on tab focus.
7. Increase the watchlist heart's touch target to at least 44×44 (native platforms) rather than relying on `hitSlop` alone.
8. Profile the Watchlist tab's ~3–4s first-load delay relative to the other tabs' sub-1.5s loads.

**P3 — polish, no rush**
9. Verify the two custom full-screen `<Modal>`s (Filters, Sort) render correctly under a real notch/Dynamic Island on an actual device or simulator, since Expo web can't confirm this and no explicit safe-area handling exists for them.
10. Port `champagne` (`#DDBE63`) into `colors.ts` for parity with the web palette, if/when a screen needs it.
11. Consider a real image/illustration treatment (even a simpler version of web's parametric emblem system) for the category-thumb placeholder on Item Detail specifically, where its simplicity is most exposed by the large hero size.

---

## Native Simulator Verification (2026-09-03)

**Conducted:** on a real iOS Simulator — iPhone 17 Pro, iOS 26.5, Xcode 26.6 — running the actual app in Expo Go, not `expo start --web`. This is the first time anything in this app has been checked on true native rendering rather than the react-native-web shim.

By this point three fix passes had already landed on top of the original audit above: the brand fonts (Newsreader/Inter/IBM Plex Mono) and the "lot ticket" price component, the Home screen redesign (hero medallion + three rails + categories), and a hero safe-area fix plus a full port of web's parametric item-emblem illustration system. All three passes were verified only through `expo start --web` + Playwright at the time, each report explicitly flagging that native font rendering and native SVG rendering specifically remained unconfirmed. This pass exists to close that gap.

**How the simulator was actually driven.** `xcrun simctl` has no touch/keyboard injection of its own, and this environment cannot grant macOS's Accessibility/Automation permission that tools like AppleScript/System Events or `cliclick` require (no interactive dialog to approve it, and `TCC.db` isn't readable or writable from a non-interactive shell). [Maestro](https://maestro.mobile.dev) (a mobile UI-testing CLI) unblocked this — it drives the simulator through Apple's own XCTest/`testmanagerd` mechanism rather than through host-level Accessibility, so it works without that permission. It needed a JVM, which isn't installed on this machine either; a portable Temurin 17 JRE was downloaded directly and pointed to via `JAVA_HOME` rather than installing anything system-wide. Screenshots throughout were taken with `xcrun simctl io booted screenshot`, i.e. real simulator framebuffer captures, not Playwright/browser screenshots.

One genuine tool limitation hit during this pass, disclosed for completeness: iOS's own "Use Strong Password?" AutoFill suggestion sheet (which appears the first time a `secureTextEntry` field is focused, distinct from the Keychain "Save Password?" alert that appeared later and *was* dismissible) does not expose its buttons through the accessibility tree Maestro reads, and no coordinate-based tap could dismiss it either — it appears to run in a separate system process outside the app's own hit-testing hierarchy. It was worked around by creating that one test account via a direct API call instead of through the Sign Up form's UI, then logging in through the UI normally (which worked without issue). This has no bearing on the app itself — Sign Up's own rendering was still verified — it's purely a note on why one account wasn't created by tapping through the form on-device in this pass.

### What's now confirmed working for real (not just claimed from web testing)

- **Fonts.** Newsreader, Inter, and IBM Plex Mono all render as themselves on native — not a system-font fallback — everywhere checked: hero headline, "lot ticket" price labels/values, mono eyebrows and status pills, section titles, form labels, native Stack headers. This was the single biggest open risk carried across all three prior phases and it's resolved.
- **The hero medallion illustration** (`components/HeroMedallion.tsx`, react-native-svg) renders pixel-for-pixel as intended on real Skia rendering: guilloché ring, gold-bordered coin circle, "MUDRA HOUSE" / "1901" / "ONE RUPEE · SILVER" text all in the correct fonts. See `native-home-hero.png`.
- **The item emblem illustration system** (`components/Emblem.tsx`) renders correctly and *distinctly* per item on real native SVG, not just structurally as confirmed on web. Checked across real catalog data: William IV, Edward VII, and George V each render their own crown shape and monogram ("W IV", "E VII", "G V" — italic Newsreader, correctly); Republic-era coins and notes render the Ashoka-device abstraction instead; notes render the banknote frame with tier-appropriate corner ornaments; plain (unmatched) items fall back to the plain roundel. See `native-home-rails-categories.png`, `native-auctions.png`, `native-item-detail.png`.
- **Certified items' seal renders correctly and is no longer obscured.** Checked both real certified items in the catalog — the PCGS-graded George V rupee and the PMG-graded George VI ten-rupee note — and the gold ribbon-and-checkmark seal renders cleanly in the emblem's upper-right corner on both, distinct from the crown/frame beneath it.
- **Home's hero safe-area fix works as designed.** The hero's eyebrow ("TRUSTED INDIAN AUCTION HOUSE") sits with clear, deliberate breathing room below the status bar/Dynamic Island rather than crowding it. See `native-home-hero.png`.
- **The brand green fix, the "lot ticket" component, and the My Listings non-seller gate message** (all from the second fix pass) all render correctly and exactly as designed on native: the green "APPROVED" pill in `native-my-listings-seller.png`, the bordered mono price boxes throughout, and — reached by direct navigation as a non-seller — "Selling starts with an application" with a working Apply to Sell button instead of the old raw `"Insufficient permissions"` string (`native-my-listings-nonseller.png`).
- **Live Auction's dark theme, stat boxes, and dark-variant lot ticket** all render correctly (`native-live-auction.png`).
- Sign Up, Apply to Sell (both the non-seller blank-form state and the already-covered "you're already approved" state described in the original audit), Sell an Item, and My Orders all render cleanly with correct fonts and no new issues.

### Genuinely new findings — only visible now, on real native rendering

**1. On every tab screen except Home, the custom page title sits directly under the status bar/Dynamic Island clock, with visible overlap.** This is the exact class of bug the hero safe-area fix addressed on Home — but that fix was only ever applied to Home's own hero. Auctions ("All Auctions"), Watchlist, Notifications, and Profile all render their own page title via a plain `<Text>` at the top of a `ScrollView`/`FlatList`, with no `useSafeAreaInsets()` padding, and the tab navigator itself renders with `headerShown: false` (see `(tabs)/_layout.tsx`) — so nothing else reserves that space either. On a notched/Dynamic-Island phone the status bar's clock digits visibly cut through the title text on all four of these screens. This is invisible on `expo start --web` (no status bar exists in a browser) and was flagged as an open risk rather than a confirmed bug in the Home-redesign pass's own report — it's now confirmed, and confirmed to extend beyond Home. See `native-auctions.png`, `native-watchlist.png`, `native-notifications.png`, `native-profile-nonapproved.png` — all show the clock overlapping the title. The fix is mechanical and already proven on Home: apply the same `insets.top`-based top padding to each of these four screens' own header block.

**2. Every pushed screen's back button shows the literal route-group name `"(tabs)"` instead of no label or a sensible one.** React Navigation's native iOS back button defaults to showing the *previous* screen's title next to the chevron; since the `(tabs)` entry in the root `Stack` (`app/_layout.tsx`) has no explicit `options={{ title: ... }}`, iOS falls back to the raw route name. This shows as literal text "(tabs)" next to the back chevron on Item Detail, Sell an Item, My Listings, My Orders, and Apply to Sell (confirmed in `native-item-detail.png`, `native-sell-item.png`, `native-my-listings-seller.png`, `native-my-orders.png`, `native-apply-to-sell.png`); it's set on Live Auction too but happens to be visually invisible there specifically because that screen's own title is long enough that iOS collapses the back button to a bare chevron with no label at all (confirmed via the accessibility tree, not just the screenshot — the label is still literally `"(tabs)"` for VoiceOver users even when not visually shown). This is invisible on web (no native back-button chrome exists there) and wasn't caught by any prior web-only pass. Fix: give the `(tabs)` `Stack.Screen` entry in `app/_layout.tsx` an explicit `options={{ title: '' }}` (or `headerBackTitle`/`headerBackButtonDisplayMode: 'minimal'`), which is a one-line change covering every pushed screen at once.

**3. Data note, not a UI bug: the seeded `seller@mudrahouse.in` account has `role: "seller"` but `sellerStatus: "none"`.** Logging in as this account and opening Profile shows the "You haven't applied to sell yet" gate rather than "You're an approved seller," which is *correct* behavior given that DB state — the seller-application-status gate itself works exactly as designed (confirmed against both states — see `native-profile-nonapproved.png` vs `native-profile-approved.png`, the latter captured after temporarily flipping this one test account's `sellerStatus` to `'approved'` in the database to reach the Sell an Item / My Listings screens, then reverting it before finishing). This is a seed-data gap (`prisma/seed.ts` creates this user with `role: 'seller'` directly but never sets a matching `sellerStatus`/`SellerApplication` row) worth fixing at the data level if `seller@mudrahouse.in` is meant to be usable as a ready-made approved-seller test account going forward — it is not a defect in any of the three UI fix passes.

### Net effect on the original P0–P3 list above

P0 (fonts) and P1 items #3 (branded headers) and #4 (My Listings gate) are now confirmed fixed and confirmed correct on real native rendering, not just on web. Item #5 (green centralization) is likewise confirmed. The two new findings above — the tab-screen safe-area gap and the `"(tabs)"` back-button label — are new P1-equivalent items: both are one-screen-pattern, mechanical fixes with an already-proven solution, both invisible without a real device/simulator, and both affect every screen of their kind at once.
