import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { type Theme, useLocale, useTheme } from '@/stores/preferences';

/**
 * The app itself, running in the page: its real tab screens on sample data, built from the app's
 * code by `pnpm demo` (../scripts/build-web-demo.mjs) into public/demo. DemoDialog shows it when
 * the visitor presses View demo; it fades in only once it has drawn, so nothing moves.
 */
const DEMO_URL = 'demo/index.html';

const darkQuery = '(prefers-color-scheme: dark)';

function subscribeToSystemTheme(onChange: () => void) {
  const media = window.matchMedia?.(darkQuery);
  media?.addEventListener('change', onChange);
  return () => media?.removeEventListener('change', onChange);
}

/** The theme the page shows: the visitor's pick, else the system's. */
function useShownTheme(): Theme {
  const picked = useTheme();
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia?.(darkQuery).matches ?? false,
    () => false,
  );
  return picked ?? (systemDark ? 'dark' : 'light');
}

export function LiveDemo({
  className,
  onReady,
}: Readonly<{ className?: string; onReady?: () => void }>) {
  const { t } = useTranslation();
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const theme = useShownTheme();
  const lang = useLocale();
  // The first theme and language go in the address so the demo's first frame already matches.
  const [src] = useState(() => `${DEMO_URL}?theme=${theme}&lang=${lang}`);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== frame.current?.contentWindow) return;
      if ((event.data as { type?: unknown } | null)?.type !== 'jx-care-demo:ready') return;
      setReady(true);
      onReady?.();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onReady]);

  // Later theme and language changes go by message, once the demo is listening.
  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      { type: 'jx-care-demo', theme, lang },
      window.location.origin,
    );
  }, [theme, lang, ready]);

  return (
    // This site's own page, same origin on purpose: it runs scripts and loads its fonts and its
    // SQLite file from here, which a sandbox would block.
    // oxlint-disable-next-line react/iframe-missing-sandbox
    <iframe
      ref={frame}
      src={src}
      title={t('sample.liveDemo')}
      loading="lazy"
      tabIndex={ready ? undefined : -1}
      aria-hidden={ready ? undefined : true}
      className={cn(
        'border-0 bg-canvas transition-opacity duration-500 ease-out',
        ready ? 'opacity-100' : 'pointer-events-none opacity-0',
        className,
      )}
    />
  );
}
