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
      className="grid scroll-mt-6 gap-x-16 gap-y-6 py-12 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:py-16 xl:gap-x-24"
    >
      <div className="lg:sticky lg:top-8 lg:self-start">
        <h2 id={titleId} className="text-display font-bold tracking-tight">
          {t(`features.groups.${group.key}`)}
        </h2>
        <div className="mt-5 grid max-w-sm gap-4">
          {group.visuals.map((Visual) => (
            <Visual key={Visual.name} />
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border lg:-mt-3">
        {group.features.map((feature) => (
          <li key={feature} className="py-4">
            <h3 className="text-title-s font-semibold">{t(`features.items.${feature}.title`)}</h3>
            <p className="mt-0.5 max-w-prose text-body text-ink-muted">
              {t(`features.items.${feature}.text`)}
            </p>
            <p className="mt-1.5 max-w-prose text-body">
              <span className="font-semibold">{t('features.example')}</span>{' '}
              {t(`features.items.${feature}.example`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeaturesPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('meta.featuresTitle'));

  const hero = (
    <div className={cn(landingColumn, 'pt-10 pb-14 on-hero sm:pt-14 lg:pt-20 lg:pb-20')}>
      <h1 className="max-w-[18ch] text-headline-sm font-bold tracking-tight text-balance sm:text-headline">
        {t('featuresPage.title')}
      </h1>
      <p className="mt-6 max-w-[56ch] text-body-l text-ink-muted sm:text-lg sm:leading-relaxed">
        {t('featuresPage.lead')}
      </p>
    </div>
  );

  return (
    <LandingShell hero={hero}>
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
