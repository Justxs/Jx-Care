import { useTranslation } from 'react-i18next';

import { buttonClasses } from '@/components/button';
import { setLocale, useLocale } from '@/stores/preferences';

/** Shows the current language; one tap switches to the other. */
export function LanguageToggle() {
  const { t } = useTranslation();
  const locale = useLocale();
  const next = locale === 'lt' ? 'en' : 'lt';

  return (
    <button
      type="button"
      lang={next}
      onClick={() => setLocale(next)}
      aria-label={t('language.label')}
      title={t('language.switchTo')}
      className={buttonClasses({ variant: 'ghost', size: 'icon' })}
    >
      <span aria-hidden="true" className="text-label font-semibold tracking-wide uppercase">
        {locale}
      </span>
    </button>
  );
}
