import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { buttonClasses } from '@/components/button';
import { ExternalLink } from '@/components/external-link';
import { cn } from '@/lib/cn';
import { intlLocale } from '@/lib/format';
import { useDocumentTitle } from '@/lib/use-document-title';
import { useLocale } from '@/stores/preferences';

import { featureGroups } from './feature-groups';
import { LandingShell, landingColumn } from './landing-shell';
import { SOURCE_URL } from './links';
import { ConflictCard, ProductsCard } from './showcase/sample-cards';
import { TodayPhone } from './showcase/today-phone';

const facts = [
  { key: 'accounts', figure: 0 },
  { key: 'tracking', figure: 0 },
  { key: 'gallery', figure: 0 },
  { key: 'languages', figure: 2 },
  { key: 'price', figure: 0, price: true },
] as const;

const privacyItems = ['pin', 'switcher', 'photos', 'backup'] as const;

function Hero() {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        landingColumn,
        'grid items-start gap-x-12 gap-y-12 pt-10 pb-14 sm:pt-14 lg:grid-cols-[5fr_7fr] lg:pt-20 lg:pb-0',
      )}
    >
      <div className="on-hero lg:pt-6">
        <h1 className="text-headline-sm font-bold tracking-tight text-balance sm:text-headline">
          {t('hero.title')}
        </h1>
        <p className="mt-6 max-w-[46ch] text-body-l text-ink-muted sm:text-lg sm:leading-relaxed">
          {t('hero.lead')}
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link to="/features" className={buttonClasses({ size: 'lg' })}>
            {t('hero.primary')}
            <ArrowRight aria-hidden="true" />
          </Link>
          <ExternalLink
            href={SOURCE_URL}
            className={buttonClasses({ variant: 'outline', size: 'lg' })}
          >
            {t('hero.source')}
            <ArrowUpRight aria-hidden="true" />
          </ExternalLink>
        </div>
        <p className="mt-6 max-w-[46ch] text-label text-ink-muted">{t('hero.soon')}</p>
      </div>
      <ShowcaseStage />
    </div>
  );
}

function ShowcaseStage() {
  return (
    <div className="flex justify-center gap-5 lg:-mb-40 lg:justify-end">
      <TodayPhone />
      <div className="hidden w-84 shrink-0 flex-col gap-5 pt-14 md:flex lg:hidden xl:flex">
        <ProductsCard delay={240} />
        <ConflictCard delay={420} />
      </div>
    </div>
  );
}

function Statement() {
  const { t } = useTranslation();
  const locale = useLocale();
  const titleId = useId();
  const number = new Intl.NumberFormat(intlLocale(locale));
  const euros = new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <section
      aria-labelledby={titleId}
      className={cn(landingColumn, 'pt-14 pb-14 sm:pb-20 lg:pt-56')}
    >
      <h2 id={titleId} className="text-display font-bold tracking-tight">
        {t('statement.title')}
      </h2>
      {/* The figure leads each row, so it reads with its label instead of across the page. */}
      <dl className="mt-6 divide-y divide-border border-y border-border-strong/40">
        {facts.map((fact) => (
          <div
            key={fact.key}
            className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-4 gap-y-1 py-4 sm:grid-cols-[5rem_minmax(0,15rem)_minmax(0,1fr)] sm:items-baseline sm:gap-x-6 lg:grid-cols-[6rem_minmax(0,18rem)_minmax(0,1fr)]"
          >
            <dt className="col-start-2 row-start-1 self-baseline text-body font-semibold">
              {t(`statement.${fact.key}.label`)}
            </dt>
            <dd className="col-start-2 row-start-2 max-w-prose text-body text-ink-muted sm:col-start-3 sm:row-start-1">
              {t(`statement.${fact.key}.text`)}
            </dd>
            <dd className="col-start-1 row-span-2 row-start-1 text-title-l font-bold text-accent tabular-nums sm:row-span-1 sm:text-display">
              {'price' in fact ? euros.format(fact.figure) : number.format(fact.figure)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FeatureOverview() {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="border-t border-border">
      <div className={cn(landingColumn, 'py-14 sm:py-20')}>
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <div>
            <h2 id={titleId} className="text-display font-bold tracking-tight">
              {t('features.title')}
            </h2>
            <p className="mt-3 max-w-[60ch] text-body-l text-ink-muted">{t('features.lead')}</p>
          </div>
          <Link to="/features" className={buttonClasses({ variant: 'outline' })}>
            {t('features.seeAll')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {featureGroups.map((group) => (
            <li key={group.key} className="border-t border-border-strong/40 pt-4">
              <h3 className="text-title-s font-semibold">
                <Link
                  to="/features"
                  hash={group.key}
                  className="group inline-flex min-h-11 items-center gap-1.5 rounded-sm underline-offset-4 hover:text-accent hover:underline"
                >
                  {t(`features.groups.${group.key}`)}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </Link>
              </h3>
              <ul className="mt-1 space-y-1 text-body text-ink-muted">
                {group.features.map((feature) => (
                  <li key={feature}>{t(`features.items.${feature}.title`)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Privacy() {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section id="privacy" aria-labelledby={titleId} className="border-t border-border bg-surface">
      <div
        className={cn(
          landingColumn,
          'grid gap-x-16 gap-y-8 py-14 sm:py-20 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:gap-x-24',
        )}
      >
        <div className="lg:sticky lg:top-8 lg:self-start">
          <h2 id={titleId} className="text-display font-bold tracking-tight">
            {t('privacy.title')}
          </h2>
          <p className="mt-3 max-w-[60ch] text-body-l text-ink-muted">{t('privacy.lead')}</p>
        </div>
        <ul className="divide-y divide-border border-y border-border-strong/40 lg:-mt-1">
          {privacyItems.map((item) => (
            <li
              key={item}
              className="grid gap-x-8 gap-y-1 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:items-baseline"
            >
              <h3 className="text-body font-semibold">{t(`privacy.items.${item}.title`)}</h3>
              <p className="max-w-prose text-body text-ink-muted">
                {t(`privacy.items.${item}.text`)}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('meta.title'));

  return (
    <LandingShell hero={<Hero />}>
      <Statement />
      <FeatureOverview />
      <Privacy />
    </LandingShell>
  );
}
