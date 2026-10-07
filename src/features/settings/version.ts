import * as Application from 'expo-application';
import Constants from 'expo-constants';

/** "1.2.0 (14)": the version from app.json and the store build number EAS gave this build. */
export function versionLabel(
  version: string | null | undefined,
  build: string | null | undefined,
): string {
  const v = version || '1.0.0';
  return build ? `${v} (${build})` : v;
}

/** This build's version for S1 About (docs/releasing.md). */
export function appVersionLabel(): string {
  return versionLabel(
    Constants.expoConfig?.version ?? Application.nativeApplicationVersion,
    Application.nativeBuildVersion,
  );
}
