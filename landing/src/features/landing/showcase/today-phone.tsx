import {
  Calendar,
  CalendarCheck,
  Droplets,
  House,
  ListChecks,
  Package,
  Pipette,
  Settings,
} from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { StatusBadge } from '@/components/badges';
import { CheckMark } from '@/components/check-mark';
import { cn } from '@/lib/cn';
import { longDate } from '@/lib/format';
import { useLocale } from '@/stores/preferences';

import { LiveDemo } from './live-demo';
import { ProductThumb } from './sample-cards';
import { Meter } from './showcase-card';

/**
 * The screen is laid out at the app's real size (390 × 844 pt, the iPhone the spec designs for)
 * and scaled down as a whole, so it keeps true proportions like a screenshot would.
 */
const SCREEN_WIDTH = 390;
const SCREEN_HEIGHT = 844;
const VIEW_WIDTH = 284;
const SCALE = VIEW_WIDTH / SCREEN_WIDTH;
const VIEW_HEIGHT = Math.round(SCREEN_HEIGHT * SCALE);

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

function StatusBar() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-[54px] shrink-0 items-center justify-between px-8 pt-1 text-[17px] font-semibold tabular-nums"
    >
      <span className="w-[54px] text-center">9:41</span>
      <span className="absolute top-[11px] left-1/2 h-[37px] w-[125px] -translate-x-1/2 rounded-full bg-black" />
      <span className="flex items-center gap-[6px]">
        <svg viewBox="0 0 18 12" className="h-[12px] w-[18px]" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-[12px] w-[16px]" fill="currentColor">
          <path d="M8 2.6c2.3 0 4.4.9 6 2.4l1.2-1.3A10.3 10.3 0 0 0 8 .8 10.3 10.3 0 0 0 .8 3.7L2 5c1.6-1.5 3.7-2.4 6-2.4Zm0 3.5c1.3 0 2.5.5 3.5 1.3l1.2-1.3A7 7 0 0 0 8 4.3a7 7 0 0 0-4.7 1.8l1.2 1.3c1-.8 2.2-1.3 3.5-1.3Zm0 3.4c-.5 0-1 .2-1.3.5L8 11.4l1.3-1.4c-.3-.3-.8-.5-1.3-.5Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-[13px] w-[27px]">
          <rect
            x="0.5"
            y="0.5"
            width="23"
            height="12"
            rx="3.8"
            fill="none"
            stroke="currentColor"
            opacity="0.4"
          />
          <rect x="2" y="2" width="16" height="9" rx="2.5" fill="currentColor" />
          <path
            d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z"
            fill="currentColor"
            opacity="0.4"
          />
        </svg>
      </span>
    </div>
  );
}

function SectionTitle({
  id,
  children,
  aside,
}: Readonly<{ id: string; children: string; aside?: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1 pb-2">
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
        'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-label font-semibold',
        area === 'skin' ? 'bg-skin-soft text-skin' : 'bg-hair-soft text-hair',
      )}
    >
      <CalendarCheck aria-hidden="true" className="size-4" />
      <span aria-hidden="true">{count}</span>
    </li>
  );
}

/** One thin side button on the frame. */
function SideButton({ className }: Readonly<{ className: string }>) {
  return (
    <span
      aria-hidden="true"
      className={cn('absolute w-[3px] rounded-[2px] bg-[#2b2427] dark:bg-[#3a3236]', className)}
    />
  );
}

/**
 * The app's Today screen in a phone frame, at a fixed size so the page never shifts while it
 * animates. The rows settle in one after another once the phone has risen in; then the live demo
 * of the real app, when it is built, fades in over the drawing.
 */
export function TodayPhone({ className }: Readonly<{ className?: string }>) {
  const { t } = useTranslation();
  const locale = useLocale();
  const morningId = useId();
  const hairId = useId();
  const expiringId = useId();
  // Once the real app shows, the drawing under it leaves the accessibility tree and tab order.
  const [live, setLive] = useState(false);

  return (
    <figure
      aria-label={t('sample.phoneLabel')}
      style={{ '--card-delay': '80ms' }}
      className={cn(
        'relative m-0 shrink-0 motion-safe:animate-card-in max-[359px]:[zoom:0.9] md:self-start',
        className,
      )}
    >
      <SideButton className="top-[104px] -left-[2px] h-[22px]" />
      <SideButton className="top-[142px] -left-[2px] h-[44px]" />
      <SideButton className="top-[196px] -left-[2px] h-[44px]" />
      <SideButton className="top-[160px] -right-[2px] h-[66px]" />

      <div
        className="relative rounded-[50px] bg-linear-to-b from-[#3b3236] via-[#1e191b] to-[#2c2528] p-[7px] shadow-raised ring-1 ring-black/60 dark:from-[#4a4045] dark:via-[#211c1e] dark:to-[#3a3236] dark:shadow-[0_2px_6px_rgb(0_0_0/0.4),0_24px_56px_rgb(0_0_0/0.5)] dark:ring-white/20"
        style={{ width: VIEW_WIDTH + 14 }}
      >
        <div className="rounded-[43px] bg-black p-[1px]">
          <div
            className="relative overflow-hidden rounded-[42px] bg-canvas text-ink"
            style={{ width: VIEW_WIDTH - 2, height: VIEW_HEIGHT - 2 }}
          >
            <div
              className="absolute top-0 left-0 flex flex-col"
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                scale: `${SCALE}`,
                transformOrigin: 'top left',
              }}
            >
              <StatusBar />

              <div inert={live} className="flex min-h-0 flex-1 flex-col px-4 pt-2">
                <div className="px-1">
                  <p className="text-display font-bold tracking-tight">{t('sample.greeting')}</p>
                  <p className="text-body text-ink-muted first-letter:uppercase">
                    {longDate(locale)}
                  </p>
                </div>

                <ul aria-label={t('sample.streaks')} className="mt-3 flex gap-2">
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

                <div role="group" aria-labelledby={morningId} className="mt-5">
                  <SectionTitle id={morningId} aside={t('sample.stepsDone')}>
                    {t('sample.morning')}
                  </SectionTitle>
                  <div className="rounded-lg bg-surface px-4 pt-1 pb-4 shadow-card">
                    <ul className="divide-y divide-border">
                      {morningSteps.map((step, index) => (
                        <li
                          key={step.key}
                          style={{ '--row': index }}
                          className="flex min-h-12 items-center gap-3 py-2 motion-safe:animate-settle-in"
                        >
                          <CheckMark checked={step.done} delay={420 + index * 120} />
                          <span className="min-w-0">
                            <span
                              className={cn(
                                'block text-body font-semibold',
                                step.done && 'font-medium text-ink-muted',
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
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <span className="inline-flex h-11 items-center justify-center rounded-full bg-accent text-body font-semibold text-on-accent">
                        {t('sample.start')}
                      </span>
                      <span className="inline-flex h-11 items-center justify-center rounded-full text-body font-semibold text-ink ring-1 ring-border-strong ring-inset">
                        {t('sample.allDone')}
                      </span>
                    </div>
                  </div>
                </div>

                <div role="group" aria-labelledby={hairId} className="mt-4">
                  <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-card">
                    <ProductThumb icon={Droplets} />
                    <span className="min-w-0">
                      <span id={hairId} className="block text-body font-semibold">
                        {t('sample.hairWash')}
                      </span>
                      <span className="block text-label text-ink-muted">
                        {t('sample.hairWashWith')}
                      </span>
                    </span>
                  </div>
                </div>

                <div role="group" aria-labelledby={expiringId} className="mt-5">
                  <SectionTitle id={expiringId}>{t('sample.expiring')}</SectionTitle>
                  <div className="flex items-center gap-3 rounded-lg bg-surface p-4 shadow-card">
                    <ProductThumb icon={Pipette} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-body font-semibold">{t('sample.vitaminC')}</span>
                      <span className="block text-label text-ink-muted">
                        {t('sample.expiresIn')}
                      </span>
                    </span>
                    <StatusBadge status="expiring">{t('showcase.status.expiring')}</StatusBadge>
                  </div>
                </div>
              </div>

              <div aria-hidden="true" className="shrink-0 border-t border-border bg-surface">
                <div className="grid h-[50px] grid-cols-5 overflow-hidden px-2 pt-1.5">
                  {tabs.map((tab) => (
                    <span
                      key={tab.key}
                      className={cn(
                        'flex min-w-0 flex-col items-center gap-1 text-[12px] font-medium',
                        tab.key === 'today' ? 'text-accent' : 'text-ink-muted',
                      )}
                    >
                      <tab.icon
                        className="size-6"
                        strokeWidth={tab.key === 'today' ? 2.25 : 1.75}
                      />
                      <span className="max-w-full truncate leading-4">
                        {t(`sample.tabs.${tab.key}`)}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="flex h-[34px] items-end justify-center pb-2">
                  <span className="h-[5px] w-[134px] rounded-full bg-ink" />
                </div>
              </div>

              {/* The real app between the status bar and the home indicator, once it has loaded. */}
              <LiveDemo
                className="absolute top-[54px] left-0 h-[756px] w-full"
                onReady={() => setLive(true)}
              />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
