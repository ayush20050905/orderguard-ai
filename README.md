# OrderGuard — full source for VS Code and GitHub

This archive contains the full frontend, server API, database migrations, product reference images, tests and interview guide. Marketplace prices, inventory and payments are simulated. The optional AI endpoint needs your own provider key and model.

## 1. Run in VS Code

Install Node.js 24 or newer, VS Code and Git. Restart VS Code after installing them so its terminal finds the commands. No Python, Cloudflare account, payment credentials or separate database server is needed for the local demo.

Extract the ZIP. Open the **orderguard** folder containing package.json using File > Open Folder. Open Terminal > New Terminal and run:

~~~sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm run setup:local
pnpm start
~~~

Open the local address printed in the terminal. Keep the terminal running. Ctrl+C stops it.

The first install needs internet access. The setup command builds the app and applies unapplied database migrations to the local emulator. If prompted to apply the local migrations, answer yes. Setup can be run again: applied migrations are tracked.

If PowerShell blocks npm.ps1 or pnpm.ps1, select **Command Prompt** as your VS Code terminal profile and run the same commands. Do not disable your system security policy. If global npm installation fails because its directory is not writable, use **npx pnpm@11.25.0** in place of **pnpm** in each command.

## 2. Demonstrate the project

Click Load sample orders, then Run verification. Two sample orders match and two are blocked. Open an order to see its shipping address, reference image and prices. Place the matching demo COD order or simulate prepaid success, decline or cancellation.

Download template creates a CSV that opens in Excel. XLSX import reads the first worksheet. Use fictional addresses. No actual purchase or card charge takes place. Stock is fixed and is not reserved or decremented.

## 3. Edit the code

- app/page.tsx: interface, import, order details and checkout.
- app/globals.css: styling.
- app/api/orders/route.ts: server order workflow.
- lib/domain.ts: demo catalog, validation and exact-price rules.
- lib/import.ts: CSV and spreadsheet header mapping.
- lib/server.ts: database and browser-session helpers.
- db/schema.ts and drizzle/: database tables and migrations.
- app/api/agent/route.ts: optional AI explanation endpoint.
- public/products/: all five illustrative product photos.
- public/INTERVIEW_GUIDE.md: walkthrough and interview questions.

After initial setup, stop the server and run **pnpm dev** for live editing. Open the address it prints. To check the production build again, stop dev, run **pnpm run setup:local**, then **pnpm start**. Avoid running both servers against the same database at once.

~~~sh
pnpm test
pnpm typecheck
~~~

Local records are stored under .wrangler/ and excluded from Git. Clearing browser cookies starts a separate workspace. Removing .wrangler/ deletes the local demo data; run setup again to create an empty database.

## 4. Push to GitHub

Create a new empty repository in your GitHub account. Do not initialize it with a README or .gitignore because these are already included. Run in the project terminal:

~~~sh
git init
git add .
git commit -m "Initial OrderGuard project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/orderguard.git
git push -u origin main
~~~

Replace YOUR_USERNAME and the repository name. Complete GitHub's sign-in when prompted. If Git asks for your author identity, configure your own user.name and user.email and repeat the commit. Never put a password or access token in the remote URL.

Later changes:

~~~sh
git add .
git commit -m "Describe your change"
git push
~~~

The .gitignore excludes secrets, dependencies, builds and local database files. Commit source, images, migrations and pnpm-lock.yaml. GitHub stores the code; pushing does not automatically deploy this app. GitHub Pages cannot run its server APIs or database.

## 5. Optional AI

The app works without API keys. The assistant returns a clearly labelled rules summary until both OPENAI_API_KEY and OPENAI_MODEL are configured.

To enable real explanations locally, copy .env.example to .env, enter your own provider key/model in that file, and start with:

~~~sh
pnpm start --env-file .env
~~~

Keep .env out of Git and chat. API usage may incur provider charges. AI explanations cannot authorize purchases or bypass price validation.

Real marketplace ordering and prepaid payments require separate authorized marketplace and payment-provider integrations. Those integrations are not implemented in this demo.

## 6. Platform and validation notes

The original dashboard and checkout flows were tested in a Linux browser environment. This export uses Node-based setup scripts, with no bash required for the setup/start commands above. Native Windows/macOS were not available for testing. If the Worker runtime cannot run on your machine, use a supported Linux environment such as WSL2 and open the folder there in VS Code.

For architecture details, see docs/PROJECT_DETAILS.md. Follow this README's migration-tracking setup instead of the older manual SQL command in that document.
