import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import type { Db } from '@/db';
import { routine } from '@/db/schema';
import {
  getRoutine,
  saveRoutine,
  tickStep,
  tickSteps,
  type SaveRoutineInput,
} from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { CalendarScreen } from '../CalendarScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const { router } = jest.requireMock<{ router: { push: jest.Mock } }>('expo-router');

const TODAY = '2026-10-07';

const step = (note: string): StepInput => ({
  id: null,
  productId: null,
  note,
  scheduleKind: 'always',
  daysOfWeek: null,
  everyNDays: null,
  startDate: null,
  waitSeconds: 0,
});

function addRoutine(db: Db, over: Partial<SaveRoutineInput>): number {
  const id = saveRoutine(db, {
    name: 'Evening',
    timeOfDay: 'evening',
    customName: null,
    sortTime: '21:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    reminderTime: null,
    steps: [step('Cleanser'), step('Serum')],
    ...over,
  });
  db.update(routine)
    .set({ createdAt: new Date(2026, 9, 2, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}

/** 5 Oct done, 6 Oct partly done, 4 Oct not done, today nothing yet. */
function seed(db: Db) {
  const morning = addRoutine(db, {
    name: 'Morning',
    timeOfDay: 'morning',
    sortTime: '07:00',
    steps: [step('SPF')],
  });
  const evening = addRoutine(db, {});
  const ids = (id: number) => getRoutine(db, id, TODAY, 30)!.steps.map((s) => s.id);
  const [m1] = ids(morning);
  const ev = ids(evening);
  tickStep(db, morning, m1!, '2026-10-05', true, [m1!]);
  tickSteps(db, evening, ev, '2026-10-05', true, ev);
  tickStep(db, evening, ev[0]!, '2026-10-06', true, ev);
}

function setup({ seeded = true } = {}) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  if (seeded) seed(app.db);
  return app;
}

const cells = () => screen.getAllByTestId(/^day-\d{4}-\d{2}-\d{2}$/);

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  router.push.mockClear();
});

describe('CalendarScreen', () => {
  it('draws October 2026 in 6 rows, Monday first, with a mark per status', async () => {
    const app = setup();
    await app.render(<CalendarScreen />);
    expect(await screen.findByText('October 2026')).toBeTruthy();
    await screen.findByTestId('mark-2026-10-05-done');

    const days = cells();
    expect(days).toHaveLength(42);
    expect(days[0]).toHaveProp('testID', 'day-2026-09-28');
    expect(days[3]).toHaveProp('testID', 'day-2026-10-01');
    expect(screen.getByTestId('month-grid')).toHaveProp(
      'className',
      expect.stringContaining('h-[312px]'),
    );
    expect(
      screen
        .getAllByText(/^[MTWFS]$/, { includeHiddenElements: true })
        .map((t) => t.props.children),
    ).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);

    expect(screen.getByTestId('mark-2026-10-05-done')).toHaveProp(
      'className',
      expect.stringContaining('bg-accent'),
    );
    expect(screen.getByTestId('mark-2026-10-06-partly')).toHaveProp(
      'className',
      expect.stringContaining('h-[12px] w-[12px]'),
    );
    expect(screen.getByTestId('mark-2026-10-04-missed')).toHaveProp(
      'className',
      expect.stringContaining('border-ink-muted'),
    );
    // Today with nothing yet and days before the routines existed: no mark.
    expect(screen.getByTestId('mark-2026-10-07-pending').props.className).not.toContain('bg-');
    expect(screen.getByTestId('mark-2026-10-01-none').props.className).not.toContain('border');

    // Spoken labels carry the status and never say "missed".
    expect(screen.getByLabelText('5 October, done')).toBeTruthy();
    expect(screen.getByLabelText('6 October, partly done')).toBeTruthy();
    expect(screen.getByLabelText('4 October, not done')).toBeTruthy();
    expect(screen.getByLabelText('7 October, today, nothing done yet')).toBeTruthy();
    expect(screen.getByLabelText('1 October')).toBeTruthy();
    for (const cell of cells()) expect(cell.props.accessibilityLabel).not.toMatch(/miss/i);

    // Today is outlined; nothing selected yet.
    expect(screen.getByTestId('cell-2026-10-07')).toHaveProp(
      'className',
      expect.stringContaining('border-accent'),
    );
  });

  it('shows the skin streak card, after a break with the restart line', async () => {
    const app = setup();
    await app.render(<CalendarScreen />);
    // 5 Oct succeeded, 6 Oct was only partly done: the run ended, best stays 1.
    expect(await screen.findByText('Started again. Your best is still 1 day.')).toBeTruthy();
    expect(screen.getByLabelText(/^Skin: 0 days in a row\./)).toBeTruthy();
  });

  it('selects a tapped day with the soft accent and opens its day detail', async () => {
    const app = setup();
    await app.render(<CalendarScreen />);
    await screen.findByTestId('mark-2026-10-05-done');
    await fireEvent.press(screen.getByLabelText('5 October, done'));
    expect(router.push).toHaveBeenCalledWith('/calendar/day/2026-10-05');
    const box = screen.getByTestId('cell-2026-10-05');
    expect(box.props.className).toContain('bg-accent-soft');
    expect(box.props.className).not.toMatch(/bg-accent(\s|$)/);
    expect(screen.getByTestId('day-2026-10-05')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
  });

  it('has a three-segment switch and a Progress photos row that opens C3', async () => {
    const app = setup();
    await app.render(<CalendarScreen />);
    const switcher = screen.getByLabelText('Calendar view');
    expect(
      within(switcher)
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['Skin', 'Hair', 'Condition']);

    await fireEvent.press(screen.getByRole('button', { name: 'Progress photos' }));
    expect(router.push).toHaveBeenCalledWith('/calendar/progress');

    await fireEvent.press(within(switcher).getByRole('radio', { name: 'Hair' }));
    expect(await screen.findByText('Built in task 033.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Progress photos' })).toBeTruthy();
  });

  it('moves months with the arrows and a swipe, keeps 42 days, and Today returns', async () => {
    const app = setup();
    await app.render(<CalendarScreen />);
    await screen.findByText('October 2026');
    // Hidden on the current month, but its space is kept.
    expect(screen.queryByRole('button', { name: 'Go to this month' })).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(await screen.findByText('November 2026')).toBeTruthy();
    expect(cells()).toHaveLength(42);
    expect(cells()[0]).toHaveProp('testID', 'day-2026-10-26');
    expect(screen.getByTestId('month-grid')).toHaveProp(
      'className',
      expect.stringContaining('h-[312px]'),
    );

    await act(async () => {
      fireGestureHandler(getByGestureTestId('month-swipe'), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: -40, velocityX: -600 },
        { state: State.END, translationX: -120, velocityX: -600 },
      ]);
    });
    expect(await screen.findByText('December 2026')).toBeTruthy();
    expect(cells()).toHaveLength(42);

    await act(async () => {
      fireGestureHandler(getByGestureTestId('month-swipe'), [
        { state: State.BEGAN, translationX: 0, velocityX: 0 },
        { state: State.ACTIVE, translationX: 40, velocityX: 600 },
        { state: State.END, translationX: 120, velocityX: 600 },
      ]);
    });
    expect(await screen.findByText('November 2026')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Go to this month' }));
    expect(await screen.findByText('October 2026')).toBeTruthy();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Go to this month' })).toBeNull(),
    );
  });

  it('shows the grid with no marks and the empty line when there are no routines', async () => {
    const app = setup({ seeded: false });
    await app.render(<CalendarScreen />);
    expect(await screen.findByText('Your month fills in as you go')).toBeTruthy();
    expect(screen.getByText('Each day you tick a routine gets a dot here.')).toBeTruthy();
    expect(cells()).toHaveLength(42);
    expect(screen.queryAllByTestId(/^mark-.*-(done|partly|missed)$/)).toHaveLength(0);
    expect(screen.queryByText(/in a row/)).toBeNull();
  });

  it('reads in Lithuanian', async () => {
    const app = setup();
    await setI18nLanguage('lt');
    await app.render(<CalendarScreen />);
    expect(await screen.findByText('2026 m. spalis')).toBeTruthy();
    await screen.findByTestId('mark-2026-10-06-partly');
    expect(screen.getByLabelText('spalio 6 d., iš dalies atlikta')).toBeTruthy();
    expect(screen.getByLabelText('spalio 4 d., neatlikta')).toBeTruthy();
    expect(screen.getByText('Kalendorius')).toBeTruthy();
  });
});
