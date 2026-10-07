import { PortalHost } from '@rn-primitives/portal';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';

import type { Db } from '@/db';
import { hairTask } from '@/db/schema';
import { hairMonth, markHairDone, saveHairTask, getHairTask } from '@/features/hair/repo';
import type { HairTaskInput } from '@/features/hair/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { washMarkOf } from '../../components/HairMonthView';
import { gridDays } from '../../month';
import { CalendarScreen } from '../CalendarScreen';
import { DayDetailScreen } from '../DayDetailScreen';

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const TODAY = '2026-10-07';

const input = (over: Partial<HairTaskInput> = {}): HairTaskInput => ({
  name: 'Wash',
  kind: 'wash',
  otherKind: null,
  productIds: [],
  scheduleKind: 'interval',
  everyNDays: 3,
  intervalUnit: 'days',
  daysOfWeek: null,
  lastDoneAt: '2026-09-27',
  reminderTime: null,
  ...over,
});

function add(db: Db, over: Partial<HairTaskInput>): number {
  const id = saveHairTask(db, input(over));
  db.update(hairTask)
    .set({ createdAt: new Date(2026, 8, 20, 12).getTime() })
    .where(eq(hairTask.id, id))
    .run();
  return id;
}

/**
 * Wash every 3 days: on time 30 Sep, late 4 Oct (due 3 Oct), so due again today and 10 Oct.
 * Weekly wash last done 29 Sep: due 6 Oct, overdue. A trim on 4 Oct.
 */
function seed(db: Db) {
  const wash = add(db, {});
  markHairDone(db, wash, { day: '2026-09-30', productIds: [], note: null });
  markHairDone(db, wash, { day: '2026-10-04', productIds: [], note: 'Quick one' });
  const weekly = add(db, { name: 'Deep clean', everyNDays: 7, lastDoneAt: '2026-09-29' });
  const trim = add(db, {
    name: 'Trim',
    kind: 'other',
    otherKind: 'trim',
    everyNDays: 56,
    intervalUnit: 'weeks',
    lastDoneAt: '2026-08-01',
  });
  markHairDone(db, trim, { day: '2026-10-04', productIds: [], note: null });
  return { wash, weekly, trim };
}

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  return { ...app, ids: seed(app.db) };
}

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
});

describe('C1 Hair view', () => {
  it('marks each day as hairMonthMarks says, with spoken statuses and the hair streak card', async () => {
    const app = setup();
    await app.render(<CalendarScreen />);
    const switcher = screen.getByLabelText('Calendar view');
    await fireEvent.press(within(switcher).getByRole('radio', { name: 'Hair' }));
    await screen.findByTestId('hair-mark-2026-09-30-done');

    // Every grid day carries the mark its hairMonthMarks entry asks for.
    const marks = hairMonth(app.db, gridDays('2026-10'), TODAY);
    for (const day of gridDays('2026-10')) {
      const kind = washMarkOf(marks[day]);
      if (kind === 'none') continue;
      expect(screen.getByTestId(`hair-mark-${day}-${kind}`)).toBeTruthy();
    }
    expect(screen.getByTestId('hair-mark-2026-09-30-done').props.className).toContain('bg-hair');
    expect(screen.getByTestId('hair-mark-2026-10-04-late').props.className).toContain(
      'border-warning',
    );
    expect(screen.getByTestId('hair-mark-2026-10-06-overdue').props.className).toContain(
      'border-dashed',
    );
    expect(screen.getByTestId('hair-mark-2026-10-10-due').props.className).toContain('border-hair');

    expect(screen.getByLabelText('30 September, wash done')).toBeTruthy();
    expect(screen.getByLabelText('4 October, wash done late, trim done')).toBeTruthy();
    expect(screen.getByLabelText('6 October, wash overdue')).toBeTruthy();
    expect(screen.getByLabelText('7 October, today, wash due')).toBeTruthy();
    expect(screen.getByLabelText('10 October, wash due')).toBeTruthy();
    expect(screen.getByLabelText('5 October')).toBeTruthy();

    // Washes only; the overdue weekly wash holds the current run at 0, the best stays.
    expect(
      screen.getByLabelText('Hair: 0 days in a row. Started again. Your best is still 1 day.'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Progress photos' })).toBeTruthy();
  });

  it('opens the day detail from a hair day', async () => {
    const app = setup();
    const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');
    await app.render(<CalendarScreen />);
    await fireEvent.press(
      within(screen.getByLabelText('Calendar view')).getByRole('radio', { name: 'Hair' }),
    );
    await fireEvent.press(await screen.findByLabelText('4 October, wash done late, trim done'));
    expect(router.push).toHaveBeenCalledWith('/calendar/day/2026-10-04');
  });
});

async function openDay(app: ReturnType<typeof setup>, day: string) {
  mockParams.current = { day };
  await app.render(
    <>
      <DayDetailScreen />
      <PortalHost />
    </>,
  );
}

describe('C2 hair section', () => {
  it('lists what was done, a late wash in warning, and deletes a log after a dialog', async () => {
    const app = setup();
    await openDay(app, '2026-10-04');
    expect(await screen.findByText('Quick one')).toBeTruthy();
    expect(screen.getByText('Hair care')).toBeTruthy();
    expect(screen.getByText('Trim')).toBeTruthy();
    expect(screen.getByText('Done late, was due 3 Oct').props.className).toContain('text-warning');

    await fireEvent.press(screen.getByRole('button', { name: 'Delete Wash from this day' }));
    expect(await screen.findByText('Delete Wash on 4 Oct?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Quick one')).toBeNull());
    expect(screen.getByText('Trim')).toBeTruthy();
    // The schedule goes back to the wash before.
    expect(getHairTask(app.db, app.ids.wash, TODAY)?.lastDoneAt).toBe('2026-09-30');
  });

  it('says when the wash was due on a day with nothing done', async () => {
    const app = setup();
    await openDay(app, '2026-10-03');
    expect(await screen.findByText('Nothing done · Next wash was due 3 Oct')).toBeTruthy();
  });

  it('keeps logs older than 7 days read-only', async () => {
    const app = setup();
    await openDay(app, '2026-09-30');
    expect(await screen.findByText('Wash')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });
});
