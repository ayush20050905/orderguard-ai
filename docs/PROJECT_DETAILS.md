# OrderGuard

A deployed, interview-oriented order verification application. **The marketplace, stock and checkout are simulated.** No real orders are sent and no payments are collected. Optional AI explanations are implemented but require your own server-side provider configuration.

## Included

- React/TypeScript dashboard with .xlsx and CSV import (100 rows / 2 MB).
- Source order ID, product URL, size, INR unit price, quantity, shipping address, COD/prepaid method and currency.
- Exact variant-price equality, stock and COD eligibility checks enforced on the server.
- Revalidation after edits and before checkout.
- Durable D1 orders and activity history, with browser-session isolation.
- Duplicate source IDs rejected, conditional transitions to prevent repeat simulated orders.
- COD order flow and prepaid success/decline/cancel simulations.
- Masked **fictional** test-card receipt (Visa ending 4242); no PAN/CVV fields.
- Optional OpenAI Responses API explanations. The model cannot execute orders.
- AI-generated illustrative reference images for all five demo products.
- Sample data, CSV template download, project guide and automated policy tests.

## Run locally

Requires Node >=22.13 and the pnpm version declared in package.json. Use Node 24+ for the built-in TypeScript test runner command below.

```sh
pnpm install --frozen-lockfile
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_keen_charles_xavier.sql
pnpm start
```

Apply each migration once. The start command prints the local server URL. For frontend development, use `pnpm dev` after applying migrations. Runtime-specific instructions are in docs/RUNTIME.md. In ChatGPT Sites use its build/publish workflow, which applies hosted migrations.

Run domain and parser tests:

```sh
node --experimental-strip-types --test tests/domain.test.mjs
```

The downloadable source contains a logical `.openai/hosting.json` with D1 enabled and no existing Site identity. Register a new Site for your own deployment. Never deploy the archive using another Site's identity. Hosted secrets are not included.

## Optional AI

Set `OPENAI_API_KEY` and `OPENAI_MODEL` as server-side secret/environment values; never put them in client code, a spreadsheet or Git. Both are absent in the delivered demo. The model is explicitly configurable because account access varies. The assistant returns a labelled built-in rules summary until both are set. A provider error leaves order data unchanged.

For ChatGPT Sites, enable the OpenAI Developers plugin to provision an approved key, then configure it as a Site secret. For a standalone local Worker, use an ignored `.dev.vars` file. See `.env.example` for the expected names. Do not paste API keys into the chat.

## Data contract

First worksheet / first row is the header. Required columns: `order_id`, `product_url`, `size`, `price`, `quantity`, `shipping_address`. Optional `payment_method` defaults to `cod` when omitted and `currency` defaults to `INR`. If provided, these fields must contain supported values. Prices have at most two decimals, no currency symbols/commas; quantity is an integer 1–100. Unknown columns (including card fields) are rejected. The first worksheet must contain plain values, not formulas that need recalculation. Legacy .xls is not accepted.

Product URL identifies the demo product; URLs are not fetched. Demo price includes tax, shipping is zero. Stock is fixed, with no reservation/decrement. All monetary business logic uses integer paise.

## API

`GET /api/orders`: current session's orders and recent audit events.

`POST /api/orders` JSON actions:
- `demo`
- `import`, with `rows`
- `edit`, with `id` and complete normalized `row`
- `verify`
- `submit`, with `id`
- `pay`, with `id` and `outcome` = success / declined / cancel (simulation only).

POST requests require a matching Origin. APIs set an HttpOnly SameSite=Strict cookie, Secure on HTTPS. Queries are parameterized and scoped to the cookie. Use fictional addresses in this owner-private interview demo. Session cookies are not a substitute for authenticated production accounts.

## Limits and next steps

This is not a production purchasing bot. No live marketplace/payment adapter is configured or implemented. Live purchasing requires a specified marketplace's authorized API and a separate payment-provider integration. There is no automatic generic Amazon/Flipkart ordering. There is no live inventory reservation, payment webhook, refund/fulfillment support, cross-device account recovery, or scheduled background execution.

The audit log is useful for demonstrations but not a tamper-proof financial ledger. Some audit writes follow order updates; a storage failure can leave a missing event. Add transactional/outbox handling for production. Optional AI needs rate limits and operational usage budgets before wider sharing.

Read public/INTERVIEW_GUIDE.md for the demo script, questions and design tradeoffs.
