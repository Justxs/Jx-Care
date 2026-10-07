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

import { LandingShell, landingColumn } from './landing-shell';
import { SOURCE_URL } from './links';
import {
  ConflictCard,
  IngredientsCard,
  PhotoCard,
  ProductsCard,
  RoutineCard,
} from './showcase/sample-cards';
import { TodayPhone } from './showcase/today-phone';

const facts = [
  { key: 'account', figure: 0 },
  { key: 'languages', figure: 2 },
  { key: 'free', figure: 0, price: true },
] as const;

/** Three groups shown with their card; the other three are named under them. */
const vignettes = [
  { key: 'routines', Card: RoutineCard },
  { key: 'ingredients', Card: IngredientsCard },
  { key: 'progress', Card: PhotoCard },
] as const;

const otherGroups = ['products', 'hair', 'shopping'] as const;

const privacyItems = ['pin', 'tracking', 'switcher', 'photos', 'backup'] as const;

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

/**
 * The phone with the two strongest sample cards beside it. On phones the conflict warning comes
 * under the phone; between md and lg, and from xl, both cards stand beside it.
 */
function ShowcaseStage() {
  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:items-start md:justify-center lg:-mb-32 lg:justify-end">
      <TodayPhone />
      <div className="flex w-full max-w-sm shrink-0 flex-col gap-5 md:w-84 md:pt-14 lg:hidden xl:flex">
        <ProductsCard delay={240} className="max-md:hidden" />
        <ConflictCard delay={420} />
      </div>
    </div>
  );
}

/** Three plain facts in one strip, words rather than big numbers. */
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
      className={cn(landingColumn, 'pt-12 pb-14 sm:pb-20 lg:pt-44')}
    >
      <h2 id={titleId} className="text-display font-bold tracking-tight">
        {t('statement.title')}
      </h2>
      {/* The pink figure leads each fact, so the three read as a row of answers, not a table. */}
      <ul className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {facts.map((fact) => (
          <li key={fact.key} className="border-t border-border pt-5">
            <p aria-hidden="true" className="text-display font-bold text-accent tabular-nums">
              {'price' in fact ? euros.format(fact.figure) : number.format(fact.figure)}
            </p>
            <h3 className="mt-2 text-title-m font-bold tracking-tight text-balance">
              {t(`statement.items.${fact.key}.title`)}
            </h3>
            <p className="mt-1 max-w-[40ch] text-body text-ink-muted">
              {t(`statement.items.${fact.key}.text`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Three feature groups with the card that shows them, then the rest by name. */
function FeatureOverview() {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="border-t border-border">
      <div className={cn(landingColumn, 'py-14 sm:py-20')}>
        <h2 id={titleId} className="text-display font-bold tracking-tight">
          {t('features.title')}
        </h2>
        <p className="mt-3 max-w-[60ch] text-body-l text-ink-muted">{t('features.lead')}</p>
        <ul className="mt-10 grid items-start gap-x-10 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
          {vignettes.map(({ key, Card }) => (
            // From xl the three share rows (subgrid), so headings, links and cards line up.
            <li
              key={key}
              className="flex max-w-md flex-col xl:row-span-4 xl:grid xl:grid-rows-subgrid xl:content-start xl:gap-y-0"
            >
              <h3 className="text-title-m font-bold tracking-tight">
                {t(`features.groups.${key}`)}
              </h3>
              <p className="mt-1 text-body text-ink-muted">{t(`features.vignettes.${key}.text`)}</p>
              <Link
                to="/features"
                hash={key}
                className="group mt-1 inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-sm font-semibold text-accent underline-offset-4 hover:underline"
              >
                {t(`features.vignettes.${key}.link`)}
                <ArrowRight
                  aria-hidden="true"
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </Link>
              <Card className="mt-4 self-start" />
            </li>
          ))}
        </ul>
        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-4 border-t border-border pt-6">
          <p className="flex flex-wrap items-center gap-x-1 text-body text-ink-muted">
            {t('features.also')}
            {otherGroups.map((key, index) => (
              <span key={key} className="inline-flex items-center">
                <Link
                  to="/features"
                  hash={key}
                  className="inline-flex min-h-11 items-center rounded-sm px-1 font-semibold text-ink underline decoration-border-strong underline-offset-4 hover:text-accent hover:decoration-current"
                >
                  {t(`features.groups.${key}`)}
                </Link>
                {index < otherGroups.length - 1 ? <span aria-hidden="true">·</span> : null}
              </span>
            ))}
          </p>
          <Link to="/features" className={cn(buttonClasses({ variant: 'outline' }), 'sm:ml-auto')}>
            {t('features.seeAll')}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
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
