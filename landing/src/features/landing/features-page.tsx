import { Link } from '@tanstack/react-router';
import { ArrowDown } from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/use-document-title';

import { type FeatureGroup, featureGroups } from './feature-groups';
import { LandingShell, landingColumn } from './landing-shell';

function GroupSection({ group }: Readonly<{ group: FeatureGroup }>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <section
      id={group.key}
      aria-labelledby={titleId}
      className="grid scroll-mt-20 gap-x-10 gap-y-6 py-12 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:scroll-mt-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-x-16 lg:py-16 xl:gap-x-24"
    >
      {/* Below lg the sticky group bar sits at the top, so the card sticks just under it. */}
      <div className="md:sticky md:top-20 md:self-start lg:top-8">
        <h2 id={titleId} className="text-display font-bold tracking-tight">
          {t(`features.groups.${group.key}`)}
        </h2>
        <div className="mt-5 grid max-w-sm gap-4">
          {group.visuals.map((Visual) => (
            <Visual key={Visual.name} />
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border md:-mt-3">
        {group.features.map((feature) => (
          <li key={feature} className="py-4">
            <h3 className="text-title-s font-semibold">{t(`features.items.${feature}.title`)}</h3>
            <p className="mt-0.5 max-w-prose text-body text-ink-muted lg:text-body-l">
              {t(`features.items.${feature}.text`)}
            </p>
            <p className="mt-1.5 max-w-prose text-body lg:text-body-l">
              <span className="font-medium text-ink-muted">{t('features.example')}</span>{' '}
              {t(`features.items.${feature}.example`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Jump links to the six groups: a list in the band on wide screens, a sticky row on phones. */
function GroupIndex({ variant }: Readonly<{ variant: 'band' | 'bar' }>) {
  const { t } = useTranslation();

  if (variant === 'band') {
    return (
      <nav aria-label={t('featuresPage.index')} className="max-lg:hidden">
        <ul className="grid grid-cols-2 gap-x-10 border-t border-border-strong">
          {featureGroups.map((group) => (
            <li key={group.key} className="border-b border-border-strong">
              <Link
                to="/features"
                hash={group.key}
                className="group flex min-h-14 items-center justify-between gap-4 text-title-m font-semibold"
              >
                {t(`features.groups.${group.key}`)}
                <ArrowDown
                  aria-hidden="true"
                  className="size-5 text-ink-muted transition-transform duration-200 group-hover:translate-y-0.5 group-hover:text-ink"
                />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav
      aria-label={t('featuresPage.index')}
      className="sticky top-0 z-20 border-b border-border bg-canvas lg:hidden"
    >
      {/* The right edge fades so a cut-off group reads as "scroll for more"; the end padding lets
          the last one scroll clear of the fade. */}
      <ul className="flex gap-1 overflow-x-auto py-1.5 pr-10 pl-4 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none] sm:pl-8">
        {featureGroups.map((group) => (
          <li key={group.key} className="shrink-0">
            <Link
              to="/features"
              hash={group.key}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-body font-medium text-ink-muted hover:text-ink"
            >
              {t(`features.groups.${group.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function FeaturesPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('meta.featuresTitle'));

  const hero = (
    <div
      className={cn(
        landingColumn,
        'grid items-end gap-x-16 gap-y-10 pt-10 pb-14 on-hero sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:pt-20 lg:pb-20',
      )}
    >
      <div>
        <h1 className="max-w-[18ch] text-headline-sm font-bold tracking-tight text-balance sm:text-headline">
          {t('featuresPage.title')}
        </h1>
        <p className="mt-6 max-w-[56ch] text-body-l text-ink-muted sm:text-lg sm:leading-relaxed">
          {t('featuresPage.lead')}
        </p>
      </div>
      <GroupIndex variant="band" />
    </div>
  );

  return (
    <LandingShell hero={hero}>
      <GroupIndex variant="bar" />
      <div className={cn(landingColumn, 'pt-4 pb-4')}>
        <div className="divide-y divide-border">
          {featureGroups.map((group) => (
            <GroupSection key={group.key} group={group} />
          ))}
        </div>
      </div>
    </LandingShell>
  );
}
