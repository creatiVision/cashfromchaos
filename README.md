# CashFromChaos — European Version

> **I don’t want this. CashFromChaos sells it.**

Autonomous, policy-bound recommerce operator for the **Hermes Agent Accelerated Business Hackathon** (Nous Research × NVIDIA × Stripe).

This is the **European Version** of CashFromChaos, specifically built for EU and DACH region online selling portals and European payment systems. All transactions, pricing rules, and ledger calculations are natively denominated in Euros (**€ / EUR**).

You send photos of a real object you no longer want and a one-line clue. Hermes runs the whole operation: understands the item, asks only the critical questions, routes it to the right European marketplace, prices it in Euros, drafts listings, negotiates with buyers under an explicit policy, collects a Stripe or PayPal-powered held payment, guides shipping or local pickup, and releases payout on delivery confirmation.

> Point your camera at things you don’t want. Hermes sells them.

---

## 🇪🇺 European Portals & Payment Integrations

CashFromChaos is pre-configured with adapters for major European C2C and specialized marketplaces, as well as European payment and carrier workflows:

### Supported European & Global Marketplace Portals (`src/lib/marketplace/registry.ts`)
1. **Kleinanzeigen.de (`kleinanzeigen-mock`)**: Germany's leading C2C classifieds portal — ideal for general electronics, used furniture, baby gear, and local C2C trade with optional shipping in the DACH region (0% fee).
2. **eBay Germany / DACH (`ebay-de-mock`)**: Dedicated German eBay marketplace adapter optimized for high-demand electronics, collectibles, and music gear across Germany, Austria, and Switzerland (10% fee).
3. **Wallapop (`wallapop-mock`)**: Major Southern European generalist C2C marketplace (Spain, Italy, Portugal) supporting local pickup and integrated regional shipping (0% fee).
4. **Cardmarket-Style Collector Channel (`collector-forum-mock`)**: Specialized European trading card & TCG collector network for high-value cards, binders, and rare collectibles (5% fee).
5. **Reverb Music Channel (`reverb-mock`)**: European and global specialist channel for musical instruments, guitar pedals, and audio gear (5% fee).
6. **Local Pickup Channel (`local-pickup-mock`)**: Local C2C channel for bulky items (sofas, tables, heavy appliances) that strictly disables shipping costs (0% fee).
7. **eBay Global (`ebay-mock`)**: Global reach fallback for rare or high-ticket international sales (11% fee).

### European Payment & Custody Services (`src/lib/payments.ts`)
- **Stripe Checkout (EUR / €)**: Native Euro payment processing. Configured with `payment_method_types: ["card", "paypal"]` to enable standard European credit/debit cards as well as **PayPal** through Stripe.
- **PayPal Integration**: Direct PayPal checkout option for European buyers who prefer paying via PayPal balance or SEPA direct debit.
- **Simulated Held Payment (Escrow-Like Flow)**: Out-of-the-box offline mode holding funds until buyer delivery/pickup confirmation before releasing net payout to the seller.
- **European Fulfillment & Carrier Labels**: Integrated shipping workflows supporting European carriers (e.g. Correos, DHL Europe) with prepaid tracked shipping labels.

---

## 🛠️ Step-by-Step Installation Guide

Follow this guide to set up and run CashFromChaos locally.

### Prerequisites
- **Node.js**: Version 18.x or 20.x (LTS recommended)
- **npm**: Version 9.x or later
- *(Optional)* **Hermes CLI**: If using the live local `hermes` LLM operator brain (`OPERATOR_BRAIN=hermes`)

### Step 1: Clone the Repository & Install Dependencies
Open your terminal and run:
```bash
git clone https://github.com/your-org/cashfromchaos.git
cd cashfromchaos
npm install
```

### Step 2: Configure Environment Variables (Optional)
By default, CashFromChaos runs **100% offline with zero setup required**, using simulated held payments and the deterministic policy engine or local Hermes CLI.

If you wish to test with real Stripe test-mode Checkout, PayPal, or specific operator settings, create a `.env.local` file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your preferred credentials:
```env
# Stripe test-mode key for real EUR card/PayPal checkout
STRIPE_SECRET_KEY=sk_test_51...

# Optional: Set base URL for mobile / Tailscale testing
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Operator Brain Selection: "hermes" (default, uses local hermes CLI) or "fixture" (pure offline deterministic)
OPERATOR_BRAIN=hermes

# Payment Provider Selection: "stripe", "paypal", or "simulated" (default: stripe if key present, else simulated)
PAYMENT_PROVIDER=stripe
```

### Step 3: Run the Development Server
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Verification & Production Build
To check TypeScript types, run unit tests, or build for production:
```bash
# Type check
npm run typecheck

# Run unit tests
npm test

# Build for production
npm run build

# Start production server
npm run start
```

---

## 📖 Step-by-Step Usage Guide (With Examples)

CashFromChaos operates through an intuitive workflow: **Intake → Operational Analysis & Policy Setup → Marketplace Routing → Buyer Sandbox Negotiation → Held Payment → Fulfillment & Payout**.

Below are two detailed end-to-end examples demonstrating how the software handles different European product categories.

---

### Example 1: Selling a Used Gaming PC

In this scenario, a seller wants to sell a pre-owned desktop PC in Europe. The software routes it to European electronics channels (Kleinanzeigen / eBay Germany) with tracked shipping.

#### 1. Seller Intake (`/intake`)
- **Photo**: Upload a photo of the desktop PC.
- **One-line clue**: `"I want to sell this used gaming PC"`
- **Critical Questions**:
  1. *Does it power on and pass benchmark/display tests cleanly?* → **Fully working**
  2. *What CPU/GPU specs or RAM are included?* → **i7, RTX 3070, 16GB RAM**
- Tap **Confirm — Go Live**.

#### 2. Operational Analysis & Policy (`/item/[id]`)
Hermes automatically generates the operational strategy:
- **Archetype**: Pre-owned Electronics / Computer
- **Market Estimate**: €600 – €800
- **Marketplace Routing**: Primary channel selected as **Kleinanzeigen.de (`kleinanzeigen-mock`)** or **eBay Germany (`ebay-de-mock`)** for high German/EU tech buyer demand.
- **Commerce Policy**:
  - Target Price: **€700.00**
  - Floor Price (Seller limit): **€550.00**
  - Auto-Counter Threshold: Concedes half the gap down to **€600.00**
  - Human Approval: Required for any offer below **€550.00**
  - Fulfillment: Tracked shipping enabled (Max spend: **€15.00**)

#### 3. Buyer Negotiation (`/market`)
A buyer opens the listing in the Buyer Sandbox:
- **Buyer**: *"Would you take €450?"*
  - **Hermes Reply**: *"€450 is too low for an RTX 3070 system. My floor is higher. I can do €650 if you buy today."* (Bounded by policy; offer was below €550 floor).
- **Buyer**: *"How about €600?"*
  - **Hermes Reply**: *"€600 works. I'll send a secure payment link now."* (Auto-accept threshold reached; deal agreed at **€600.00**).

#### 4. Payment & Custody
- The buyer clicks **Pay with Card / PayPal**.
- The €600.00 payment is captured and marked as **Held in Custody**.

#### 5. Shipping & Payout Release (`/item/[id] → Fulfillment`)
- Hermes generates a prepaid tracked European shipping label (**€8.50**).
- Seller drops the package at the post office and marks **Shipped**.
- Upon delivery, buyer confirms receipt → status changes to **Delivered**.
- **Ledger & P&L**:
  - Gross Revenue: **+€600.00**
  - Marketplace Fee (Kleinanzeigen 0% / eBay DE 10%): **-€0.00** or **-€60.00**
  - Shipping Label: **-€8.50**
  - **Net Payout Released to Seller**: **€531.50** (or **€591.50**)

---

### Example 2: Selling a Used Sofa (Bulky / Local Pickup)

In this scenario, a seller wants to sell a large, heavy living room sofa. Hermes recognizes that shipping a sofa across Europe is cost-prohibitive and enforces a **Local Pickup Only** policy.

#### 1. Seller Intake (`/intake`)
- **Photo**: Upload a photo of the 3-seater fabric sofa.
- **One-line clue**: `"I want to sell this living room sofa"`
- **Critical Questions**:
  1. *What are the dimensions (L x W x H)?* → **210cm x 90cm x 85cm**
  2. *Any stains, tears, or pet wear?* → **Good condition, no stains**
- Tap **Confirm — Go Live**.

#### 2. Operational Analysis & Policy (`/item/[id]`)
Hermes evaluates the item:
- **Archetype**: Bulky Furniture / Home
- **Market Estimate**: €120 – €250
- **Marketplace Routing**: Routed to **Local Pickup Channel (`local-pickup-mock`)** and **Kleinanzeigen.de (`kleinanzeigen-mock`)**.
- **Commerce Policy**:
  - Target Price: **€180.00**
  - Floor Price: **€100.00**
  - Fulfillment Mode: **Strictly Local Pickup Only** (`shippingFriendly: false`). Shipping spend limit set to **€0.00**.

#### 3. Buyer Negotiation & Policy Enforcement (`/market`)
A buyer attempts to request shipping:
- **Buyer**: *"I love the sofa! Can you ship it to my apartment in Berlin for €180?"*
  - **Hermes Reply**: *"This sofa is local pickup only in accordance with our policy. I cannot ship bulky furniture, but you are welcome to pick it up in person!"* (Strict policy refusal).
- **Buyer**: *"Okay, I'll bring a van. Would you accept €140 for local pickup?"*
  - **Hermes Reply**: *"€140 is a deal for local pickup. Pay via the link to lock in your pickup reservation."* (Deal agreed at **€140.00**).

#### 4. Payment & Local Pickup Fulfillment
- Buyer pays **€140.00** via Stripe / PayPal. Payment is held in custody.
- Hermes provides pickup instructions and address coordination.
- Buyer arrives with a van, inspects the sofa, and takes it home.
- Seller taps **Confirm Local Pickup / Delivery**.
- **Ledger & P&L**:
  - Gross Revenue: **+€140.00**
  - Marketplace Fee (Local Pickup 0%): **€0.00**
  - Shipping Spend: **€0.00**
  - **Net Payout Released to Seller**: **€140.00**

---

## 🛠️ How It's Built

- **Next.js 14 (App Router) + TypeScript + Tailwind CSS**: Zero-database architecture using an in-memory store (`src/lib/store.ts`) persisting state across hot reloads.
- **Hermes Operator Brain (`src/lib/operator/llmBrain.ts`)**: Integrates with the local `hermes` CLI (powered by Nemotron via Nous Portal) to analyze items and draft human-like buyer replies.
- **Deterministic Policy Engine (`FixtureBrain`, `src/lib/operator/fixtureBrain.ts`)**: Base class providing safe, bounded fallback execution. Ensures Hermes can never sell below the floor price, overspend on shipping, or accept unauthorized payment methods.
- **Marketplace Registry (`src/lib/marketplace/registry.ts`)**: Modular adapters for European C2C portals (Kleinanzeigen, eBay DE, Wallapop, Cardmarket, Reverb, Local Pickup).
- **Stripe & PayPal Custody (`src/lib/payments.ts`)**: Escrow-like held payment flow in Euros (€) releasing funds upon delivery.

---

## 🎥 Quick Demo Tour

1. **` / `**: Landing page introducing CashFromChaos.
2. **`/intake`**: Upload photo, enter clue, answer 1-2 critical questions.
3. **`/dashboard`**: Ops overview of active listings, target prices, confidence levels, and reset controls.
4. **`/item/[id]`**: Detailed decision trace, policy parameters, listings, and P&L ledger.
5. **`/market`**: Buyer sandbox for live negotiation chat and payment checkout.
6. **Fulfillment**: Mark shipped / delivered to trigger automated payout release.

For the full scene-by-scene script, see [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).

---

## 📜 Image Credits

Demo photos are used under Creative Commons licenses:
- `public/img/pokemon.jpg`: Klapi (CC BY-SA 4.0)
- `public/img/pedal.jpg`: Guitar Chalk (CC BY 2.0)
- `public/img/furniture.jpg`: Steven V. Rose (CC BY-SA 3.0)
- `public/img/stroller.jpg`: Ciara Ní Riain (CC BY-SA 4.0)
- `public/img/generic.jpg`: StockSnap (CC0)
