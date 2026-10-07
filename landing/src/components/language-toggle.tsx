import { useTranslation } from 'react-i18next';

import { buttonClasses } from '@/components/button';
import { setLocale, useLocale } from '@/stores/preferences';

/**
 * Shows the language it switches to ("LT" on the English page), named in that language for screen
 * readers ("Lietuviškai"), so the label and its voice agree.
 */
export function LanguageToggle() {
  const { t } = useTranslation();
  const locale = useLocale();
  const next = locale === 'lt' ? 'en' : 'lt';

  return (
    <button
      type="button"
      lang={next}
      onClick={() => setLocale(next)}
      aria-label={t('language.switchTo')}
      title={t('language.switchTo')}
      className={buttonClasses({ variant: 'ghost', size: 'icon' })}
    >
      <span aria-hidden="true" className="text-label font-semibold tracking-wide uppercase">
        {next}
      </span>
    </button>
  );
}
