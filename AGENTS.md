# CashFromChaos — AI Agent Operating Brief

> **Point your camera at things you don't want. Hermes sells them.**

CashFromChaos is an autonomous, policy-bound recommerce operator built for the **Hermes Agent Accelerated Business Hackathon** (Nous Research × NVIDIA × Stripe). It is a single Next.js application that demonstrates end-to-end autonomous selling: a seller sends photos of a physical item with a one-line clue, and the operator (Hermes) handles analysis, marketplace routing, pricing, listing, buyer negotiation, Stripe payment custody, fulfillment instructions, and payout.

## Project Overview

- **Type:** Next.js 14 (App Router) + TypeScript + Tailwind CSS web application
- **Purpose:** Hackathon demo / product prototype — no database, in-memory store
- **Status:** Runnable MVP with a deterministic fallback and optional live LLM operator
- **Key differentiator:** Policy-bound autonomous commerce over real-world physical inventory (not just "AI writes listings")

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14.2 (App Router) | `force-dynamic` on all API routes and pages |
| Language | TypeScript 5.5 | Strict mode enabled |
| Styling | Tailwind CSS 3.4 | Custom NVIDIA-inspired design tokens |
| UI | React 18.3 | Server components + `"use client"` where needed |
| Payments | Stripe SDK 16.12 | Test-mode Checkout; simulated mode when no key set |
| State | In-memory store (Map on `globalThis`) | Survives Next.js dev hot-reloads; no database |
| Operator | Hermes CLI (local) via `child_process.execFile`, single-shot `-z` mode | Falls back to deterministic engine on any CLI failure |
| Bundler | Next.js built-in (webpack/turbopack) | |

## Quick Start

```bash
npm install
npm run dev              # → http://localhost:3000
```

**Build / checks:**

```bash
npm run typecheck        # tsc --noEmit   (verified passing)
npm run build            # production build
npm run start            # serve the production build
```

**No env required for demo** (simulated payments work out of the box). For real Stripe test mode, copy `.env.example` to `.env.local` and set `STRIPE_SECRET_KEY`. In test mode pay with card `4242 4242 4242 4242`, any future expiry, any CVC.

## Project Structure

```
cashfromchaos/
├── public/img/             # Demo item photos (CC-licensed placeholders; pokemon,
│                           # pedal, furniture, stroller + generic fallback)
├── scripts/                # Utility scripts (not tests)
│   └── generate_hackathon_visuals.py   # Python/Pillow generator → writes to docs/assets/
├── src/
│   ├── app/                # Next.js App Router pages + API routes
│   │   ├── api/            # All backend API endpoints
│   │   │   ├── items/      # POST (create) + GET (list)
│   │   │   ├── items/[id]/ # GET single item
│   │   │   ├── negotiate/  # POST buyer message → get agent reply
│   │   │   ├── checkout/   # POST create Stripe/simulated checkout
│   │   │   ├── checkout/confirm/  # GET Stripe redirect handler
│   │   │   ├── fulfillment/ # POST ship/deliver actions
│   │   │   └── reset/      # POST re-seed three demo items
│   │   ├── dashboard/      # Operations overview page
│   │   ├── intake/         # Seller submission page (camera + clue)
│   │   ├── item/[id]/      # Per-item operation detail page
│   │   ├── market/         # Buyer sandbox listing grid
│   │   ├── market/[id]/    # Single listing with negotiation chat
│   │   ├── page.tsx        # Landing / hook page
│   │   ├── layout.tsx      # Root layout (nav, footer, PWA manifest)
│   │   ├── manifest.ts     # Web app manifest generator (Add-to-Home-Screen support)
│   │   └── globals.css     # Tailwind directives + custom component classes
│   ├── components/         # React UI components (flat, no deep nesting)
│   │   ├── Nav.tsx         # Sticky header nav + mobile bottom tab bar
│   │   ├── ItemDetail.tsx  # Full operation detail (tabs: analysis → P&L)
│   │   ├── BuyerListing.tsx # Negotiation chat + Stripe payment UI
│   │   ├── Timeline.tsx    # Transaction state machine visual
│   │   ├── ui.tsx          # Shared UI primitives (StatusBadge, TraceList, Section, etc.)
│   │   └── ResetButton.tsx # "↺ Reset demo" button
│   ├── lib/                # Domain core (server-side)
│   │   ├── types.ts        # All domain types and OperatorBrain interface
│   │   ├── store.ts        # In-memory store, item CRUD, seeding, orchestration
│   │   ├── payments.ts     # Stripe/simulated checkout + ledger/P&L
│   │   ├── money.ts        # Currency formatting, rounding, offer parsing
│   │   ├── operator/       # Swappable operator brains
│   │   │   ├── index.ts    # Brain selection (env OPERATOR_BRAIN)
│   │   │   ├── archetypes.ts   # Item archetypes / product knowledge base
│   │   │   ├── fixtureBrain.ts # Deterministic policy engine (base class + fallback)
│   │   │   ├── llmBrain.ts     # HermesBrain — live operator (extends FixtureBrain)
│   │   │   └── hermesCli.ts    # CLI bridge to local Hermes binary (`<bin> -z`)
│   │   └── marketplace/    # Marketplace adapter registry
│   │       └── registry.ts # Adapter interface + mock implementations
│   └── fixtures/           # Demo data
│       └── items.ts        # Three demo seeds (Pokémon binder, guitar pedal, chair)
├── .env.example            # Environment variable reference (heavily commented)
├── DEMO_SCRIPT.md          # Scene-by-scene video demo script
├── nvidia-DESIGN.md        # Canonical design-system reference
├── CLAUDE.md               # Claude Code operating brief (companion to this file)
├── next.config.mjs         # Next.js config (reactStrictMode only)
├── tailwind.config.ts      # Tailwind with NVIDIA design tokens
├── tsconfig.json           # TypeScript strict config
└── package.json            # Dependencies and scripts
```

## API Routes

All API routes are `force-dynamic`. Data flows through the in-memory store.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/items` | GET | List all items (auto-seeds demo data) |
| `/api/items` | POST | Create item from intake (clue + photo + answers) |
| `/api/items/[id]` | GET | Get single item by ID |
| `/api/negotiate` | POST | Submit buyer message → get agent reply |
| `/api/checkout` | POST | Create Stripe/simulated checkout session |
| `/api/checkout/confirm` | GET | Handle post-payment redirect (holds payment, runs fulfillment planning) |
| `/api/fulfillment` | POST | Advance fulfillment (ship / deliver) |
| `/api/reset` | POST | Re-seed three demo items |

## Domain Architecture

### OperatorBrain Interface (`src/lib/types.ts`)

The core abstraction: every operation goes through a swappable brain. The rest of the app only knows this interface.

```typescript
interface OperatorBrain {
  analyzeItem(input: ItemIntake): Promise<ItemAnalysis>;
  chooseMarketplace(input: ItemAnalysis): Promise<MarketplacePlan>;
  buildPolicy(analysis, plan): Promise<CommercePolicy>;
  draftListings(analysis, plan, policy): Promise<ListingDraft[]>;
  handleBuyerMessage(item, message): Promise<AgentReply>;
  decideFulfillment(item): Promise<FulfillmentPlan>;
}
```

### Brain implementations (selected via `OPERATOR_BRAIN` env var)

Selection lives in `src/lib/operator/index.ts` and caches the chosen brain. Accepted values: `hermes` (default), `llm` (alias for `hermes`), or `fixture`.

| Mode | Class | Description |
|---|---|---|
| `hermes` / `llm` (default) | `HermesBrain` | Live operator: extends the deterministic engine, calls the local Hermes CLI for buyer-facing text (listings + negotiation prose). All price/decision numbers stay policy-bound. Falls back to deterministic output on any CLI failure/timeout. |
| `fixture` | `FixtureBrain` | Purely deterministic: no CLI, no network, fully offline. Uses archetype matching + policy logic. Also serves as the base class for HermesBrain. |

**Key design rule:** Hermes provides the voice (reply copy + listing descriptions); the deterministic engine provides every number (price, policy, accept/counter/decline decision). An LLM can never push a price below floor or overspend.

### Transaction State Machine

Every item moves through these statuses (append-only operational traces are recorded at each step for the dashboard timeline):

```
analyzed → listed → buyer-engaged → offer-accepted → paid → shipping-required → in-transit → delivered → payout-released
                                                                                                  ↑
                                                                                             escalated
```

`escalated` can be reached from negotiation (below floor / scam detection); human approval moves it back to `offer-accepted`.

### CommercePolicy — the hard boundary

Every brain obeys the seller's `CommercePolicy`:

- `targetPrice` — ideal sell price
- `floorPrice` — absolute minimum (cannot go below without human approval)
- `autoAcceptAtOrAbove` — accept without question
- `autoCounterDownTo` — lowest counter the agent can autonomously propose
- `requireHumanBelow` — floor for human escalation
- `maxFulfillmentSpend` — budget cap for shipping/labels
- `allowedPaymentMethods` — only on-platform (Stripe)
- `suspiciousBuyerEscalation` — scam/off-platform detection

## Design System (NVIDIA-inspired)

The UI uses a custom NVIDIA-derived design system defined in `tailwind.config.ts` (canonical reference: `nvidia-DESIGN.md`):

- **Colors:** `ink` black (`#000000`), `panel` paper white (`#ffffff`), `panel2` soft surface (`#f7f7f7`), `edge` hairline (`#cccccc`), `cash` NVIDIA green accent (`#76b900`), `cashdim` hover green (`#5a8d00`), `chaos` error red (`#e52020`), `gold` warning (`#df6500`), `muted` gray (`#757575`)
- **Typography:** NVIDIA Sans (proprietary) with `ui-sans-serif` fallback
- **Geometry:** 2px border radius everywhere (all radius tokens forced to 2px except `rounded-full` for avatars/dots)
- **Surfaces:** flat panels with hairline borders; signature green corner square (7×7px)
- **Shadows:** none on cards — only the green focus ring (`shadow-glow`) and a scanline effect on the hero section

CSS component classes defined in `@layer components` in `globals.css`: `.panel`, `.panel-2`, `.chip`, `.btn-cash`, `.btn-ghost`, `.label`.

## Key Conventions

### Code Style

- **TypeScript strict mode** (`strict: true` in tsconfig)
- **Path aliases:** `@/` maps to `./src/*`
- **ES2021 target**, `moduleResolution: "bundler"`
- All domain types live in `src/lib/types.ts`
- Server components by default; interactivity uses `"use client"` only where needed
- API routes use `export const dynamic = "force-dynamic"` (never cached)
- Append-only operational traces on every item for the dashboard timeline
- Fixtures stay dependency-free (no store import) to avoid circular module dependencies

### File Organization

- Every concern has a single file: types, store, money, payments, marketplace registry, archetypes
- Each operator brain is one file; selection is in `operator/index.ts`
- Pages mirror the route path (`/intake/page.tsx`, `/dashboard/page.tsx`)
- Components are flat in `src/components/`

### Build Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # next lint
npm run typecheck    # tsc --noEmit
```

### Testing

Jest (ts-jest) is configured; tests live next to the code they cover
(`src/lib/__tests__/`, `src/lib/store.test.ts`, `src/lib/payments.test.ts`):

- `npm test` — run the Jest suite
- `npm run typecheck` — TypeScript noEmit check
- `npm run build` — production build
- `npm run dev` — manual demo walkthrough (see `DEMO_SCRIPT.md` for the click path)

When adding archetypes or registry adapters, extend the channel-integrity guard
in `src/lib/__tests__/archetypes.test.ts`. Note that `scripts/generate_hackathon_visuals.py`
is a Python/Pillow asset generator (outputs to `docs/assets/`), not a test tool.

### Environment Variables

See `.env.example` (well-commented). Key variables:

| Variable | Default | Purpose |
|---|---|---|
| `OPERATOR_BRAIN` | `hermes` | `hermes` or `llm` (live operator), `fixture` (fully deterministic offline) |
| `STRIPE_SECRET_KEY` | (empty) | Real Stripe test-mode sk_test_; empty = simulated payments |
| `STRIPE_PUBLISHABLE_KEY` | | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | | Stripe webhook secret |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Base URL for Stripe redirects |
| `HERMES_BIN` | `hackathon` | CLI binary for the Hermes operator (isolated hackathon profile) |
| `HERMES_MODEL` | (unset) | Optional model override for Hermes CLI (profile default: Nemotron via Nous Portal) |
| `HERMES_TIMEOUT_MS` | `60000` | Per-call timeout before deterministic fallback |

### Security Considerations

- **Operator never reveals seller's address** before payment is held (`handleBuyerMessage` in `fixtureBrain.ts` blocks personal-info probes)
- **Off-platform payment detection:** the negotiation engine catches WhatsApp, Western Union, overpayment scams, gift cards, and suspicious urgency
- **Implausibly high offers** (≥ 1.5x target price) are automatically rejected as likely troll/overpayment scams
- **Stripe keys are optional** — without them the app runs fully simulated payments (no secrets needed)
- **Hermes CLI uses an isolated profile** (`hackathon` binary via `HERMES_BIN`, never bare `hermes`) so the demo never bills the user's personal profile quota. Configure once with `hackathon portal` then `hackathon model`.

### Demo Fixtures

Three seeded items (`src/fixtures/items.ts`) demonstrate different routing strategies:

1. **Pokémon card binder** → collector channel (cardmarket-style), bundle listing, tracked shipping; seeded with a lowball offer (€50) so negotiation shows live on first load
2. **Guitar effects pedal** → music gear channel (Reverb-style), shipping, condition-sensitive
3. **Furniture chair** → local pickup only, no shipping; seeded with a "ship it to Madrid?" buyer request showing the policy refusal

Each seed carries pre-baked buyer messages replayed through the operator after creation. The `↺ Reset demo` button re-seeds clean state for video takes. Extra intake photos (`stroller.jpg`, `generic.jpg` fallback) exist in `public/img/` beyond the three seeds.

### Marketplace Adapters

The marketplace router is adapter-based (interface + mock implementations in `src/lib/marketplace/registry.ts`):

| Adapter | Kind | Fee | Notes |
|---|---|---|---|
| `cashfromchaos-sandbox` | generalist | 0% | Internal demo marketplace |
| `collector-forum-mock` | collector | 5% | Trading cards & collectibles |
| `reverb-mock` | shipping | 5% | Music gear |
| `wallapop-mock` | generalist | 0% | Broad local + shipping |
| `ebay-mock` | shipping | 11% | Global fallback for rare items |
| `local-pickup-mock` | local | 0% | Bulky items, no shipping |
| `ebay-de-mock` | shipping | 10% | eBay Germany (DACH), region `de` |
| `paypal-mock` | generalist | 3% | PayPal commerce platform, region `global` |
| `kleinanzeigen-mock` | generalist | 0% | German C2C classifieds, region `de` |

### Archetype System (`src/lib/operator/archetypes.ts`)

The engine matches seller clues against known item archetypes via keyword scoring. Each archetype encodes:
- Category knowledge and confidence
- Price band (marketLow / marketHigh)
- Channel preferences (ranked)
- Critical questions to ask the seller
- Fulfillment posture (shipping / local-pickup / either)
- Flags for special handling (authenticity-sensitive, bulky, local-only, etc.)

Unmatched clues fall back to `GENERIC_ARCHETYPE` (general electronics with conservative pricing).

### What NOT to do

- Do not add a real database unless the project is taken beyond the hackathon MVP
- Do not implement real marketplace API integrations unless the core demo loop is stable
- Do not add multi-user auth — this is a single-seller demo
- Do not replace the in-memory store with a DB without updating the seeding path
- Do not change the operator brain selection logic without preserving the HermesBrain → FixtureBrain inheritance pattern (policy boundary is critical)
- Do not soften the NVIDIA design geometry (2px radius everywhere, no drop shadows, no pill buttons)
