import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { buttonClasses } from '@/components/button';
import { toggleTheme } from '@/stores/preferences';

/** Sun in dark, moon in light. CSS picks the icon and label, so the system theme needs no script. */
export function ThemeToggle() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={buttonClasses({ variant: 'ghost', size: 'icon' })}
    >
      <Moon aria-hidden="true" className="dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
      <span className="sr-only dark:hidden">{t('theme.toDark')}</span>
      <span className="sr-only hidden dark:inline">{t('theme.toLight')}</span>
    </button>
  );
}
