import {
  Calendar,
  CalendarCheck,
  House,
  ListChecks,
  Package,
  Pipette,
  Settings,
  ShowerHead,
} from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/badges';
import { CheckMark } from '@/components/check-mark';
import { cn } from '@/lib/cn';
import { longDate } from '@/lib/format';
import { useLocale } from '@/stores/preferences';

import { ProductThumb } from './sample-cards';
import { Meter } from './showcase-card';

const morningSteps = [
  { key: 'cleanser', done: true },
  { key: 'vitaminC', done: true, note: 'drops' },
  { key: 'moisturiser', done: false },
  { key: 'sunscreen', done: false },
] as const;

const tabs = [
  { key: 'today', icon: House },
  { key: 'products', icon: Package },
  { key: 'routines', icon: ListChecks },
  { key: 'calendar', icon: Calendar },
  { key: 'settings', icon: Settings },
] as const;

/** Section heading inside the phone: title above the card, as in the app. */
function PhoneHeading({
  id,
  children,
  aside,
}: Readonly<{ id: string; children: string; aside?: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      <p id={id} className="text-title-s font-semibold">
        {children}
      </p>
      {aside ? <span className="text-label text-ink-muted tabular-nums">{aside}</span> : null}
    </div>
  );
}

function StreakChip({
  count,
  label,
  area,
}: Readonly<{ count: string; label: string; area: 'skin' | 'hair' }>) {
  return (
    <li
      aria-label={label}
      className={cn(
        'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-label font-semibold',
        area === 'skin' ? 'bg-skin-soft text-skin' : 'bg-hair-soft text-hair',
      )}
    >
      <CalendarCheck aria-hidden="true" className="size-4" />
      <span aria-hidden="true">{count}</span>
    </li>
  );
}

/**
 * The app's Today screen, drawn in HTML at a fixed size so the page never shifts while it animates.
 * The rows settle in one after another once the phone has risen in.
 */
export function TodayPhone({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();
  const locale = useLocale();
  const morningId = useId();
  const hairId = useId();
  const expiringId = useId();

  return (
    <figure
      aria-label={t('sample.phoneLabel')}
      style={{ '--card-delay': '80ms' }}
      className={cn(
        'relative m-0 h-160 w-75 shrink-0 rounded-[2.75rem] bg-[#1b1618] p-2.5 shadow-raised ring-1 ring-black/40 motion-safe:animate-card-in dark:bg-black dark:ring-white/12',
        className,
      )}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[2.25rem] bg-canvas text-ink">
        <div aria-hidden="true" className="flex h-9 shrink-0 items-center justify-center">
          <span className="h-5.5 w-22 rounded-full bg-[#1b1618] dark:bg-black" />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-2">
          <div className="px-1">
            <p className="text-title-l font-bold">{t('sample.greeting')}</p>
            <p className="text-label text-ink-muted first-letter:uppercase">{longDate(locale)}</p>
          </div>

          <ul aria-label={t('sample.streaks')} className="flex gap-2">
            <StreakChip
              area="skin"
              count={t('sample.skinStreak')}
              label={t('sample.skinStreakLabel')}
            />
            <StreakChip
              area="hair"
              count={t('sample.hairStreak')}
              label={t('sample.hairStreakLabel')}
            />
          </ul>

          <div role="group" aria-labelledby={morningId} className="flex flex-col gap-2">
            <PhoneHeading id={morningId} aside={t('sample.stepsDone')}>
              {t('sample.morning')}
            </PhoneHeading>
            <div className="rounded-lg bg-surface px-3 pt-1 pb-3 shadow-card">
              <ul className="divide-y divide-border">
                {morningSteps.map((step, index) => (
                  <li
                    key={step.key}
                    style={{ '--row': index }}
                    className="flex min-h-11 items-center gap-3 py-1.5 motion-safe:animate-settle-in"
                  >
                    <CheckMark checked={step.done} delay={420 + index * 120} />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          'block text-body font-medium',
                          step.done && 'text-ink-muted line-through decoration-ink-muted/60',
                        )}
                      >
                        {t(`sample.${step.key}`)}
                      </span>
                      {'note' in step ? (
                        <span className="block text-label text-ink-muted">
                          {t(`sample.${step.note}`)}
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
              <Meter value={0.5} className="mt-2" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="inline-flex min-h-10 items-center justify-center rounded-full bg-accent text-body font-semibold text-on-accent">
                  {t('sample.start')}
                </span>
                <span className="inline-flex min-h-10 items-center justify-center rounded-full text-body font-semibold text-ink ring-1 ring-border-strong ring-inset">
                  {t('sample.allDone')}
                </span>
              </div>
            </div>
          </div>

          <div role="group" aria-labelledby={hairId} className="flex flex-col gap-2">
            <p id={hairId} className="sr-only">
              {t('sample.hairWash')}
            </p>
            <div className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-card">
              <ProductThumb icon={ShowerHead} area="hair" />
              <span className="min-w-0">
                <span aria-hidden="true" className="block text-body font-semibold">
                  {t('sample.hairWash')}
                </span>
                <span className="block text-label text-ink-muted">{t('sample.hairWashWith')}</span>
              </span>
            </div>
          </div>

          <div role="group" aria-labelledby={expiringId} className="flex flex-col gap-2">
            <PhoneHeading id={expiringId}>{t('sample.expiring')}</PhoneHeading>
            <div className="flex items-center gap-3 rounded-lg bg-surface p-3 shadow-card">
              <ProductThumb icon={Pipette} area="skin" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{t('sample.vitaminC')}</span>
                <span className="block text-label text-ink-muted">{t('sample.expiresIn')}</span>
              </span>
              <StatusBadge status="expiring">{t('showcase.status.expiring')}</StatusBadge>
            </div>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 grid h-16 grid-cols-5 border-t border-border bg-surface/95 px-1 pb-2 backdrop-blur"
        >
          {tabs.map((tab) => (
            <span
              key={tab.key}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 text-[10px] font-medium tracking-tight',
                tab.key === 'today' ? 'text-accent' : 'text-ink-muted',
              )}
            >
              <tab.icon className="size-5" />
              <span>{t(`sample.tabs.${tab.key}`)}</span>
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}
