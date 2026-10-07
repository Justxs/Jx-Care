import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function ExternalLink({
  href,
  className,
  children,
}: Readonly<{ href: string; className?: string; children: ReactNode }>) {
  const { t } = useTranslation();

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="sr-only"> ({t('opensInNewTab')})</span>
    </a>
  );
}
