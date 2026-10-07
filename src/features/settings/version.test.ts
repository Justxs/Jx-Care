import { versionLabel } from './version';

describe('versionLabel', () => {
  it('shows the version with the build number', () => {
    expect(versionLabel('1.2.0', '14')).toBe('1.2.0 (14)');
  });

  it('shows the version alone when there is no build number (Expo Go, web)', () => {
    expect(versionLabel('1.2.0', null)).toBe('1.2.0');
    expect(versionLabel(undefined, undefined)).toBe('1.0.0');
  });
});

describe('app version', () => {
  it('is x.y.z and the same in app.json and package.json (pnpm version:bump keeps them together)', () => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const app = require('../../../app.json') as { expo: { version: string } };
    const pkg = require('../../../package.json') as { version: string };
    /* eslint-enable @typescript-eslint/no-require-imports */
    expect(app.expo.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(pkg.version).toBe(app.expo.version);
  });
});
