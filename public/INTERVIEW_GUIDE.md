# OrderGuard: interview walkthrough

## A clear, honest introduction

“OrderGuard is an Excel-driven order verification prototype. It reads order details, resolves a product and its size, and only permits checkout when the spreadsheet unit price exactly matches the catalog unit price. I used a server-side policy engine so that a browser edit or an AI answer cannot bypass the purchasing rule. The current deployment uses a simulated marketplace and payment flow. An optional AI endpoint explains the results.”

Study the code and describe only what you understand. Do not claim the demo has live marketplace ordering, real payment processing, production authentication, or a trained ML model.

## Five-minute demonstration

1. Click **Load sample orders**, then **Run verification**.
2. ORD-1001 matches at INR 6,499. Open it and place a demo COD order. Explain that payment is due on delivery, not “paid”.
3. ORD-1002 has INR 2,999 in the sheet and INR 3,299 in the catalog. The agent blocks it even though the product is available.
4. Edit ORD-1002’s price to 3299. Saving removes its previous verification. Close the details and run verification again.
5. ORD-1003 is two training tees at INR 899 each. Its total is INR 1,798, but the comparison uses unit prices. Continue to prepaid checkout. Demonstrate decline first, then resume payment and simulate success. The receipt shows a fictional Visa ending 4242.
6. ORD-1004 is blocked because the catalog has no stock, although its price matches.
7. Show the activity log and reload the page: records remain for the same browser session.
8. Download the CSV template, open it in Excel, edit the IDs and import it. The app also reads .xlsx files. Reimporting existing IDs is rejected.
9. Ask the assistant a question. With no configured AI key/model it explicitly returns a rules summary. Do not present the fallback as a live LLM.

## Architecture

Browser (React + TypeScript)
→ Excel/CSV parser
→ same-origin server API
→ input validation
→ product/variant lookup
→ deterministic price, stock and payment rules
→ explicit checkout action
→ server recheck
→ simulated order/payment transition
→ D1 SQLite persistence and audit log.

An optional OpenAI Responses API endpoint receives order IDs, statuses, prices and block reasons. It does not receive addresses or card details, cannot call the checkout API, and cannot override the policy.

## What makes this an agent?

The core is a bounded, rule-based workflow agent: it validates inputs, looks up products, evaluates eligibility, records decisions and controls checkout states. It is not an autonomous LLM purchasing agent. The optional AI feature explains results. This distinction is valuable: exact financial constraints belong in deterministic code.

## Common interview questions

**Why not ask the AI whether the prices match?**
Because price equality is a precise business rule. The policy converts INR into integer paise and compares exact integers. An LLM is not needed to decide equality and must not authorize spending.

**Why integer paise?**
Floating-point arithmetic can introduce precision errors. INR 6,499.00 becomes 649900 paise. Inputs with more than two decimal places are rejected instead of silently rounded.

**What happens if the marketplace price is lower?**
It still blocks. The user specified equality, not “less than or equal”.

**How do you identify the correct product?**
The demo requires an exact allowed product URL and matching size. A live adapter must map a supported merchant URL to an authoritative product/variant ID and currency. It must not blindly fetch arbitrary uploaded URLs.

**Why check twice?**
The first check enables review; the second is at submission. A live store can change prices between the two. This demo’s catalog is fixed, so it demonstrates the recheck without pretending to solve distributed price locking.

**Can two clicks create duplicate orders?**
A unique database index rejects repeated source IDs within a session. Conditional updates permit only a ready order to become placed/awaiting_payment and only an awaiting_payment order to become placed. Repeated successful submissions return the existing state. A live integration additionally needs provider idempotency keys and reconciliation for uncertain remote outcomes.

**Why not store full credit card details?**
The app has no card-number or CVV input. A production design uses a payment provider’s hosted checkout and retains a token plus masked brand/last four digits when available. The current card display is explicitly fictional.

**When is a prepaid order considered paid?**
In this demo, only after the explicit simulated success action. In production, only after server verification of the provider’s signed payment event, checking amount, currency, order association and event idempotency. A browser redirect is not sufficient.

**What about inventory?**
Demo stock is fixed and checked per order, not reserved or decremented. A real store must perform atomic stock reservation/order creation and handle partial failure. Do not claim this demo prevents aggregate overselling.

**How is data separated?**
An unguessable HttpOnly, SameSite session cookie scopes every database query. The deployment is owner-private. This is browser-session isolation, not a production multi-user identity system. Clearing cookies creates a new workspace; production needs authenticated accounts and ownership tied to those accounts.

**What are the main limitations?**
No live marketplace or payment adapter, fixed stock, no refunds or fulfillment, no background retries, no production account system or retention controls, and optional AI not configured by default. The demo is useful for explaining the architecture, not for taking real customer orders.

## Code to study

- lib/domain.ts: product catalog, strict normalization, integer money conversion and eligibility policy.
- lib/import.ts: CSV handling and spreadsheet header mapping.
- app/api/orders/route.ts: import, edit, verify, submit and simulated payment state transitions.
- lib/server.ts: session cookie, origin checks, prepared queries and audit helper.
- db/schema.ts and drizzle/: persistent database schema and migrations.
- app/api/agent/route.ts: optional AI explanation with rules fallback.
- app/page.tsx: dashboard, import, order details and payment simulation.
- tests/domain.test.mjs: policy and parser regression tests.

## Extending to a real marketplace

Choose the marketplace first and verify that its official API permits the intended buyer/seller operation. WooCommerce merchant order creation is different from buying a product on Amazon or Flipkart. Add a provider-specific adapter; do not assume arbitrary public product links grant ordering access.

Before using real customer data: authenticated accounts, provider idempotency, atomic stock handling, time-limited price quotes, shipping/tax verification, payment webhooks, event deduplication, audit consistency, secret management, rate limits, monitoring, retention/deletion controls and recovery/reconciliation are required. Keep the deterministic rules independent from the LLM.
