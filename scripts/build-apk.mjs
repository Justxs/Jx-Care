// Builds a test APK on this computer without EAS: `pnpm apk`. Needs Android Studio (its JDK in
// JAVA_HOME and the SDK in ANDROID_HOME). The APK is signed with the debug key, so it can't update
// an EAS-signed install or the other way round (docs/releasing.md).
// Writes dist/jx-care-<version>.apk.
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const pkgUrl = new URL('package.json', root);
const version = JSON.parse(readFileSync(new URL('app.json', root), 'utf8')).expo.version;
const run = (cmd, cwd = root) =>
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, CI: '1', NODE_ENV: 'production' },
  });

// Prebuild rewrites the android and ios scripts in package.json; keep ours.
const pkgText = readFileSync(pkgUrl, 'utf8');
try {
  run('pnpm expo prebuild --platform android --no-install');
} finally {
  writeFileSync(pkgUrl, pkgText);
}

// arm64 only: every current phone, and a much shorter build than all four ABIs.
const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
run(`${gradlew} assembleRelease -PreactNativeArchitectures=arm64-v8a`, new URL('android/', root));

mkdirSync(new URL('dist/', root), { recursive: true });
const out = new URL(`dist/jx-care-${version}.apk`, root);
copyFileSync(new URL('android/app/build/outputs/apk/release/app-release.apk', root), out);
console.log(`APK: ${out.pathname}`);
