// Sets the app version (docs/releasing.md): `pnpm version:bump patch|minor|major` or
// `pnpm version:bump 1.4.0`. app.json `expo.version` is what the stores and Settings show;
// package.json keeps the same number. Build numbers are EAS's job (appVersionSource: remote).
import { readFileSync, writeFileSync } from 'node:fs';

const appUrl = new URL('../app.json', import.meta.url);
const pkgUrl = new URL('../package.json', import.meta.url);
const app = JSON.parse(readFileSync(appUrl, 'utf8'));

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const current = app.expo.version;
const match = SEMVER.exec(current);
if (!match) throw new Error(`app.json version ${current} is not x.y.z`);
const [major, minor, patch] = match.slice(1).map(Number);

const arg = process.argv[2];
const next =
  arg === 'major'
    ? `${major + 1}.0.0`
    : arg === 'minor'
      ? `${major}.${minor + 1}.0`
      : arg === 'patch'
        ? `${major}.${minor}.${patch + 1}`
        : arg;
if (!next || !SEMVER.test(next)) {
  console.error('Usage: pnpm version:bump patch|minor|major|x.y.z');
  process.exit(1);
}

// Rewrites only the version lines, keeping each file's formatting.
const appText = readFileSync(appUrl, 'utf8');
const pkgText = readFileSync(pkgUrl, 'utf8');
writeFileSync(appUrl, appText.replace(`"version": "${current}"`, `"version": "${next}"`));
writeFileSync(
  pkgUrl,
  pkgText.replace(`"version": "${JSON.parse(pkgText).version}"`, `"version": "${next}"`),
);
console.log(`Version ${current} → ${next}`);
