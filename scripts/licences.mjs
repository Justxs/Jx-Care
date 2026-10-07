// Writes src/features/settings/licences.json: name, version and licence of every runtime
// dependency in package.json. Run with `pnpm run licences` after adding or updating packages.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

const rows = Object.keys(pkg.dependencies)
  .sort()
  .map((name) => {
    let meta = {};
    try {
      meta = JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8'));
    } catch {
      // Packages that hide package.json from `exports`: find it next to the entry point.
      const entry = require.resolve(name);
      const root = entry.slice(
        0,
        entry.lastIndexOf(`node_modules/${name}/`) + 13 + name.length + 1,
      );
      meta = JSON.parse(readFileSync(`${root}package.json`, 'utf8'));
    }
    const license = typeof meta.license === 'string' ? meta.license : meta.license?.type;
    return { name, version: meta.version, license: license ?? 'See package' };
  });

writeFileSync(
  new URL('../src/features/settings/licences.json', import.meta.url),
  `${JSON.stringify(rows, null, 2)}\n`,
);
console.log(`Wrote ${rows.length} packages`);
