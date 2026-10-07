import { ArrowUpRight, Mail } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Brand, BrandMark } from '@/components/brand';
import { buttonClasses } from '@/components/button';
import { ExternalLink } from '@/components/external-link';
import { LanguageToggle } from '@/components/language-toggle';
import { ScallopEdge } from '@/components/scallop-edge';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/cn';

import { BUILD_GUIDE_URL, SOURCE_URL, SUGGESTION_EMAIL } from './links';

export const landingColumn = 'mx-auto w-full max-w-7xl px-4 sm:px-8 lg:px-10';

const navLink =
  'inline-flex min-h-11 items-center rounded-full px-3 text-body font-medium text-ink-muted transition-colors duration-200 hover:text-ink max-sm:hidden';

function SignOff() {
  return (
    <div className={cn(landingColumn, 'flex justify-center pt-16 pb-12 sm:pt-20')}>
      <Brand size="lg" stacked />
    </div>
  );
}

function Door({
  title,
  text,
  children,
}: Readonly<{ title: string; text: string; children: ReactNode }>) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col items-start">
      <h2 id={titleId} className="text-title-s font-semibold">
        {title}
      </h2>
      <p className="mt-1 mb-4 max-w-prose text-body text-ink-muted">{text}</p>
      <div className="mt-auto">{children}</div>
    </section>
  );
}

function LandingDoors() {
  const { t } = useTranslation();
  const suggestionHref = `mailto:${SUGGESTION_EMAIL}?subject=${encodeURIComponent(t('close.suggestSubject'))}`;
  const outline = buttonClasses({ variant: 'outline' });

  return (
    <div className="border-t border-border">
      <div
        className={cn(
          landingColumn,
          'grid gap-x-12 gap-y-10 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-3',
        )}
      >
        <Door title={t('close.getTitle')} text={t('close.getText')}>
          <ExternalLink href={SOURCE_URL} className={outline}>
            {t('close.getAction')}
            <ArrowUpRight aria-hidden="true" />
          </ExternalLink>
        </Door>
        <Door title={t('close.buildTitle')} text={t('close.buildText')}>
          <ExternalLink href={BUILD_GUIDE_URL} className={outline}>
            {t('close.buildAction')}
            <ArrowUpRight aria-hidden="true" />
          </ExternalLink>
        </Door>
        <Door title={t('close.suggestTitle')} text={t('close.suggestText')}>
          <a href={suggestionHref} className={outline}>
            <Mail aria-hidden="true" />
            {t('close.suggestAction')}
          </a>
        </Door>
      </div>
    </div>
  );
}

/** Pink band with the header and hero, then the page, sign-off, doors and footer. */
export function LandingShell({
  hero,
  children,
}: Readonly<{ hero: ReactNode; children: ReactNode }>) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className={cn(
          buttonClasses(),
          'fixed top-3 left-3 z-50 -translate-y-20 shadow-raised focus-visible:translate-y-0',
        )}
      >
        {t('skip')}
      </a>
      <header className="bg-hero">
        <div
          className={cn(
            landingColumn,
            'flex items-center justify-between gap-4 pt-4 on-hero sm:pt-6',
          )}
        >
          <a
            href="#top"
            aria-label={t('nav.home')}
            className="flex min-h-11 items-center rounded-full"
          >
            <Brand markClassName="text-hero-ink" />
          </a>
          <nav aria-label={t('nav.label')} className="flex shrink-0 items-center gap-0.5">
            <a href="#features" className={navLink}>
              {t('nav.features')}
            </a>
            <a href="#privacy" className={navLink}>
              {t('nav.privacy')}
            </a>
            <LanguageToggle />
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <div className="relative isolate bg-hero">
          <ScallopEdge />
          {hero}
        </div>
        {children}
        <SignOff />
        <LandingDoors />
      </main>

      <footer className="border-t border-border">
        <div
          className={cn(
            landingColumn,
            'flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-label text-ink-muted',
          )}
        >
          <span className="flex items-center gap-2">
            <BrandMark className="h-4" />
            {t('footer')}
          </span>
          <ExternalLink
            href={SOURCE_URL}
            className="inline-flex min-h-11 items-center rounded-sm underline-offset-4 hover:text-ink hover:underline"
          >
            {t('sourceLabel')}
          </ExternalLink>
        </div>
      </footer>
    </div>
  );
}
