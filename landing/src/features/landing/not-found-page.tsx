import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { buttonClasses } from '@/components/button';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/lib/use-document-title';

import { LandingShell, landingColumn } from './landing-shell';

/** Any unknown address: the site's own header and band, and a way back. */
export function NotFoundPage() {
  const { t } = useTranslation();
  useDocumentTitle(t('notFound.title'));

  const hero = (
    <div className={cn(landingColumn, 'pt-10 pb-16 on-hero sm:pt-14 lg:pt-20 lg:pb-24')}>
      <h1 className="text-headline-sm font-bold tracking-tight text-balance sm:text-headline">
        {t('notFound.title')}
      </h1>
      <p className="mt-6 max-w-[56ch] text-body-l text-ink-muted sm:text-lg sm:leading-relaxed">
        {t('notFound.text')}
      </p>
      <Link to="/" className={cn(buttonClasses({ size: 'lg' }), 'mt-9')}>
        {t('notFound.home')}
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );

  return <LandingShell hero={hero}>{null}</LandingShell>;
}
