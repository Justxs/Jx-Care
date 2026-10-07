// Builds the website's live demo: the app's real tab screens on the story data, exported for the
// web into landing/public/demo, where the landing page frames it inside its drawn phone.
// Run with `pnpm web-demo` (or `pnpm demo` in landing/). Routes come from src/web-demo/routes
// (app.config.js), the database is sql.js in memory, and nothing is stored in the browser.
//
// The page is served from /demo/ by default. For a website hosted under a sub-path, set
// JX_WEB_DEMO_BASE_URL, e.g. JX_WEB_DEMO_BASE_URL=/Jx-Care/demo pnpm web-demo.
import { spawnSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'landing', 'public', 'demo');
const require = createRequire(import.meta.url);

rmSync(out, { recursive: true, force: true });

const result = spawnSync('pnpm', ['expo', 'export', '--platform', 'web', '--output-dir', out], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, JX_WEB_DEMO: '1', CI: '1' },
});
if (result.status !== 0) process.exit(result.status ?? 1);

// sql.js loads its WebAssembly from next to the page (src/web-demo/sqlJsDb.ts).
const wasm = path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm-browser.wasm');
copyFileSync(wasm, path.join(out, 'sql-wasm-browser.wasm'));
console.log(`Web demo ready in ${path.relative(root, out)}`);
