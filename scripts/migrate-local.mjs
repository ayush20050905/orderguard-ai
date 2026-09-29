import {
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));

const configPath = path.join(
  root,
  "dist",
  "server",
  "wrangler.json"
);

if (!existsSync(configPath)) {
  throw new Error(
    "Build output is missing. Run: pnpm run setup:local"
  );
}

const config = JSON.parse(
  readFileSync(configPath, "utf8")
);

if (
  !Array.isArray(config.d1_databases) ||
  !config.d1_databases.some(
    (database) => database.binding === "DB"
  )
) {
  throw new Error(
    "The local DB binding is missing from wrangler.json."
  );
}

for (const database of config.d1_databases) {
  database.migrations_dir = path.join(root, "drizzle");
}

writeFileSync(
  configPath,
  JSON.stringify(config, null, 2) + "\n",
  "utf8"
);

// Convert the preload path into a file URL for Windows.
const environmentModuleUrl = pathToFileURL(
  path.join(root, "scripts", "sites-env.mjs")
).href;

const wranglerPath = path.join(
  root,
  "node_modules",
  "wrangler",
  "bin",
  "wrangler.js"
);

if (!existsSync(wranglerPath)) {
  throw new Error(
    "Dependencies are missing. Run: pnpm install --frozen-lockfile"
  );
}

const result = spawnSync(
  process.execPath,
  [
    "--import",
    environmentModuleUrl,
    wranglerPath,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    configPath,
    "--persist-to",
    path.join(root, ".wrangler", "state"),
  ],
  {
    cwd: root,
    stdio: "inherit",
  }
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("Local database migrations completed.");