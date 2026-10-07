import {
  CalendarCheck,
  Droplet,
  FlaskRound,
  type LucideIcon,
  Pipette,
  Scissors,
  ShowerHead,
  Sun,
  Timer,
  TriangleAlert,
} from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import afterPhoto from '@/assets/progress/after.webp';
import beforePhoto from '@/assets/progress/before.webp';
import { AreaTag, ConflictTag, StatusBadge, type Status, Tag } from '@/components/badges';
import { CheckMark } from '@/components/check-mark';
import { WholeDates } from '@/components/whole-dates';
import { cn } from '@/lib/cn';
import { weekdayLetters, weekdayNames } from '@/lib/format';
import { useLocale } from '@/stores/preferences';

import { CardTitle, Meter, ShowcaseCard } from './showcase-card';

interface CardProps {
  className?: string;
  delay?: number;
}

/**
 * Product placeholder, as in the app: a neutral square with the category glyph, 40px so rows never
 * jump. The care area is a word (AreaTag), not a colour here.
 */
export function ProductThumb({ icon: Icon }: Readonly<{ icon: LucideIcon }>) {
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-md bg-subtle text-ink-muted"
    >
      <Icon className="size-5" />
    </span>
  );
}

/** Monday-first weekday dots; scheduled days in soft pink, spoken as words. */
export function WeekdayDots({
  days,
  className,
}: Readonly<{ days: readonly number[]; className?: string }>) {
  const locale = useLocale();
  const letters = weekdayLetters(locale);
  const names = weekdayNames(locale);
  const label = days.map((day) => names[day]).join(', ');

  return (
    <span role="img" aria-label={label} className={cn('flex gap-1', className)}>
      {letters.map((letter, index) => (
        <span
          // Letters repeat (T, S), so the position is the key.
          // oxlint-disable-next-line react/no-array-index-key
          key={index}
          aria-hidden="true"
          className={cn(
            'grid size-6 place-items-center rounded-full text-[12px] font-semibold',
            days.includes(index) ? 'bg-accent-soft text-accent' : 'text-ink-muted',
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}

const products = [
  { key: 'vitaminC', icon: Pipette, status: 'expiring' },
  { key: 'shampoo', icon: Droplet, status: 'ok' },
  { key: 'argan', icon: FlaskRound, status: 'expired' },
  { key: 'sunscreen', icon: Sun, status: 'unopened' },
] as const satisfies readonly { key: string; icon: LucideIcon; status: Status }[];

export function ProductsCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle id={titleId}>{t('showcase.products.title')}</CardTitle>
        <Tag>{t('sample.tag')}</Tag>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {products.map((product, index) => (
          <li
            key={product.key}
            style={{ '--row': index }}
            className="flex min-h-16 items-center gap-3 py-2.5 motion-safe:animate-settle-in"
          >
            <ProductThumb icon={product.icon} />
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold">
                {t(`showcase.products.${product.key}.name`)}
              </span>
              <span className="block text-label text-ink-muted">
                <WholeDates>{t(`showcase.products.${product.key}.meta`)}</WholeDates>
              </span>
            </span>
            <StatusBadge status={product.status}>
              {t(`showcase.status.${product.status}`)}
            </StatusBadge>
          </li>
        ))}
      </ul>
    </ShowcaseCard>
  );
}

/** The last seven days up to today (Wednesday 30 Sep to Tuesday 6 Oct). */
const streakDays = [2, 3, 4, 5, 6, 0, 1] as const;

export function StreakCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const locale = useLocale();
  const letters = weekdayLetters(locale);

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle id={titleId}>{t('showcase.streak.title')}</CardTitle>
        <CalendarCheck aria-hidden="true" className="size-5 text-skin" />
      </div>
      <p className="mt-2 flex items-baseline gap-2">
        <span className="text-display font-bold text-skin tabular-nums">12</span>
        <span className="text-body text-ink-muted">{t('showcase.streak.inARow')}</span>
      </p>
      <p className="text-label text-ink-muted">{t('showcase.streak.best')}</p>
      <div
        role="img"
        aria-label={t('showcase.streak.weekLabel')}
        className="mt-4 grid grid-cols-7 gap-1.5"
      >
        {streakDays.map((day, index) => {
          const today = index === streakDays.length - 1;
          return (
            <span
              key={day}
              style={{ '--row': index }}
              className="flex flex-col items-center gap-1.5 motion-safe:animate-settle-in"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid aspect-square w-full max-w-9 place-items-center rounded-md',
                  today ? 'ring-2 ring-skin ring-inset' : 'bg-skin-soft text-skin',
                )}
              >
                {today ? null : <CalendarCheck className="size-4" />}
              </span>
              <span aria-hidden="true" className="text-[12px] font-semibold text-ink-muted">
                {letters[day]}
              </span>
            </span>
          );
        })}
      </div>
    </ShowcaseCard>
  );
}

export function ConflictCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <CardTitle id={titleId}>{t('sample.evening')}</CardTitle>
        <WeekdayDots days={[1, 3]} />
      </div>
      <ul className="mt-2 divide-y divide-border">
        {(['exfoliant', 'retinol'] as const).map((step, index) => (
          <li
            key={step}
            style={{ '--row': index }}
            className="flex min-h-12 items-center justify-between gap-3 py-2 motion-safe:animate-settle-in"
          >
            <span className="min-w-0 text-body">{t(`sample.${step}`)}</span>
            <ConflictTag>{t('sample.conflict')}</ConflictTag>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2.5 rounded-md bg-warning-soft p-3 text-label text-ink">
        <TriangleAlert aria-hidden="true" className="mt-px size-4 shrink-0 text-warning" />
        <p>
          <span className="font-semibold">{t('showcase.conflict.title')}</span>{' '}
          {t('showcase.conflict.text')}
        </p>
      </div>
    </ShowcaseCard>
  );
}

export function ProductDetailCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();
  const facts = ['opened', 'lasts', 'expires', 'costPerDay'] as const;

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-start gap-3">
        <ProductThumb icon={Pipette} />
        <div className="min-w-0 flex-1">
          <CardTitle id={titleId}>{t('showcase.products.vitaminC.name')}</CardTitle>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <AreaTag area="skin">{t('showcase.area.skin')}</AreaTag>
            <StatusBadge status="expiring">{t('showcase.status.expiring')}</StatusBadge>
          </div>
        </div>
      </div>
      <p className="mt-4 flex justify-between gap-3 text-label text-ink-muted">
        <span>{t('showcase.detail.timeUsed')}</span>
        <span className="font-semibold text-warning">{t('sample.expiresIn')}</span>
      </p>
      <Meter value={0.93} tone="warning" className="mt-1.5" />
      <dl className="mt-3 divide-y divide-border text-body">
        {facts.map((fact) => (
          <div key={fact} className="flex min-h-10 items-center justify-between gap-3 py-2">
            <dt className="text-ink-muted">{t(`showcase.detail.${fact}.label`)}</dt>
            <dd className="text-right font-medium tabular-nums">
              <WholeDates>{t(`showcase.detail.${fact}.value`)}</WholeDates>
            </dd>
          </div>
        ))}
      </dl>
    </ShowcaseCard>
  );
}

const routineSteps = [
  { key: 'cleanser', schedule: 'everyTime' },
  { key: 'acidToner', schedule: 'everyFewDays', wait: true },
  { key: 'vitaminC', schedule: 'everyTime' },
  { key: 'mask', schedule: 'saturdays' },
] as const;

export function RoutineCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <CardTitle id={titleId}>{t('sample.morning')}</CardTitle>
        <WeekdayDots days={[0, 1, 2, 3, 4, 5]} />
      </div>
      <ol className="mt-2 divide-y divide-border">
        {routineSteps.map((step, index) => (
          <li
            key={step.key}
            style={{ '--row': index }}
            className="flex min-h-14 items-center gap-3 py-2 motion-safe:animate-settle-in"
          >
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full bg-subtle text-label font-semibold text-ink-muted tabular-nums"
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold">
                {t(`showcase.routine.${step.key}`)}
              </span>
              <span className="flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted">
                {t(`showcase.routine.${step.schedule}`)}
                {'wait' in step ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <Timer aria-hidden="true" className="size-3.5" />
                    {t('showcase.routine.wait')}
                  </>
                ) : null}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </ShowcaseCard>
  );
}

export function HairCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <CardTitle id={titleId}>{t('showcase.hair.title')}</CardTitle>
      <ul className="mt-3 space-y-4">
        <li className="flex gap-3">
          <ProductThumb icon={ShowerHead} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body font-semibold">
                <WholeDates>{t('showcase.hair.nextWash')}</WholeDates>
              </span>
              <span className="text-label text-ink-muted">{t('showcase.hair.everyFewDays')}</span>
            </p>
            <p className="text-label text-ink-muted">{t('sample.hairWashWith')}</p>
            <Meter
              value={1 / 3}
              tone="hair"
              className="mt-2"
              label={t('showcase.hair.washLabel')}
            />
          </div>
        </li>
        <li className="flex gap-3">
          <ProductThumb icon={Scissors} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-body font-semibold">{t('showcase.hair.trim')}</span>
              <span className="text-label text-ink-muted">
                {t('showcase.hair.everyEightWeeks')}
              </span>
            </p>
            <p className="text-label text-ink-muted">{t('showcase.hair.lastTrim')}</p>
            <Meter
              value={7 / 8}
              tone="hair"
              className="mt-2"
              label={t('showcase.hair.trimLabel')}
            />
          </div>
        </li>
      </ul>
    </ShowcaseCard>
  );
}

const ingredients = ['aqua', 'glycerin', 'shea', 'parfum', 'tocopherol'] as const;

export function IngredientsCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle id={titleId}>{t('showcase.ingredients.title')}</CardTitle>
        <StatusBadge status="expired">{t('showcase.status.avoid')}</StatusBadge>
      </div>
      <p className="text-label text-ink-muted">{t('showcase.ingredients.product')}</p>
      <ol className="mt-2 divide-y divide-border">
        {ingredients.map((ingredient, index) => (
          <li
            key={ingredient}
            style={{ '--row': index }}
            className={cn(
              'flex min-h-10 items-center justify-between gap-3 py-2 text-body motion-safe:animate-settle-in',
              ingredient === 'parfum' && 'text-danger',
            )}
          >
            {t(`showcase.ingredients.${ingredient}`)}
            {ingredient === 'parfum' ? (
              <span className="text-label font-semibold">
                {t('showcase.ingredients.onAvoidList')}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-label text-ink-muted">{t('showcase.ingredients.hint')}</p>
    </ShowcaseCard>
  );
}

const photoChanges = ['started', 'finished', 'mostly'] as const;

/** Generated sample photos of a fictional person, 600x800 WebP: redness on 8 Sep, calmer on 6 Oct. */
const progressPhotos = { before: beforePhoto, after: afterPhoto } as const;

/**
 * Two weekly photos side by side, as on the app's Compare screen, and the "What changed" lines
 * from the week in between. Photos are plain 3:4 boxes like the app's PhotoTile placeholder.
 */
export function PhotoCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle id={titleId}>{t('showcase.photos.title')}</CardTitle>
        <span className="text-label text-ink-muted">{t('showcase.photos.span')}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {(['before', 'after'] as const).map((side) => (
          <figure key={side} className="m-0">
            {/* The alt text already says the date, so the visible label is not read twice. */}
            <span aria-hidden="true" className="block text-label font-medium tabular-nums">
              {t(`showcase.photos.${side}`)}
            </span>
            {/* Width and height reserve the 3:4 box before the photo decodes, so nothing moves. */}
            <img
              src={progressPhotos[side]}
              alt={t(`showcase.photos.alt.${side}`)}
              width={600}
              height={800}
              loading="lazy"
              decoding="async"
              className="mt-1 block aspect-3/4 w-full rounded-md bg-neutral-soft object-cover"
            />
          </figure>
        ))}
      </div>
      <p className="mt-4 text-label text-ink-muted">{t('showcase.photos.changed')}</p>
      <ul className="mt-1 divide-y divide-border">
        {photoChanges.map((change, index) => (
          <li
            key={change}
            style={{ '--row': index }}
            className="py-2.5 text-body motion-safe:animate-settle-in"
          >
            {t(`showcase.photos.changes.${change}`)}
          </li>
        ))}
      </ul>
    </ShowcaseCard>
  );
}

const shopping = [
  { key: 'vitaminC', bought: false },
  { key: 'shampoo', bought: false },
  { key: 'sunscreen', bought: true },
] as const;

export function ShoppingCard({ className, delay }: Readonly<CardProps>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-center justify-between gap-3">
        <CardTitle id={titleId}>{t('showcase.shopping.title')}</CardTitle>
        <span className="text-label text-ink-muted">{t('showcase.shopping.toBuy')}</span>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {shopping.map((item, index) => (
          <li
            key={item.key}
            style={{ '--row': index }}
            className="flex min-h-14 items-center gap-3 py-2 motion-safe:animate-settle-in"
          >
            <CheckMark checked={item.bought} delay={900} />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block text-body font-semibold',
                  item.bought && 'text-ink-muted line-through',
                )}
              >
                {t(`showcase.products.${item.key}.name`)}
                {item.bought ? (
                  <span className="sr-only">, {t('showcase.shopping.bought')}</span>
                ) : null}
              </span>
              <span className="block text-label text-ink-muted">
                {t(`showcase.shopping.${item.key}`)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </ShowcaseCard>
  );
}
