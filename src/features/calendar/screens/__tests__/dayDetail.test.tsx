import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { eq } from 'drizzle-orm';
import { Text } from 'react-native';

import type { Db } from '@/db';
import { routine } from '@/db/schema';
import {
  getDayLog,
  getRoutine,
  saveRoutine,
  tickSteps,
  type SaveRoutineInput,
} from '@/features/routines/repo';
import type { StepInput } from '@/features/routines/schema';
import { saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { useSkinMonth, useSkinStreakCard } from '../../api';
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
    name: 'Evening basics',
    timeOfDay: 'evening',
    customName: null,
    sortTime: '21:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    reminderTime: null,
    steps: [step('Cleanser'), step('Serum')],
    ...over,
  });
  db.update(routine)
    .set({ createdAt: new Date(2026, 8, 20, 12).getTime() })
    .where(eq(routine.id, id))
    .run();
  return id;
}

function setup(day: string) {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  const morning = addRoutine(app.db, {
    name: 'Morning basics',
    timeOfDay: 'morning',
    sortTime: '07:00',
    steps: [step('SPF')],
  });
  const evening = addRoutine(app.db, {});
  const ids = (id: number) => getRoutine(app.db, id, TODAY, 30)!.steps.map((s) => s.id);
  mockParams.current = { day };
  return { ...app, morning, evening, m: ids(morning), ev: ids(evening) };
}

/** Shows the calendar's mark and the streak beside the screen, to see them follow a tick. */
function Probe({ day }: { day: string }) {
  const month = useSkinMonth('2026-10').data;
  const streak = useSkinStreakCard();
  return <Text testID="probe">{`${month?.statuses[day] ?? '-'} ${streak?.current ?? '-'}`}</Text>;
}

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 0)));

beforeEach(async () => {
  await setI18nLanguage('en');
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
});

describe('DayDetailScreen', () => {
  it('ticks forgotten steps on a recent day and updates the mark and the streak', async () => {
    const app = setup('2026-10-06');
    tickSteps(app.db, app.evening, [app.ev[0]!], '2026-10-06', true, app.ev);
    await app.render(
      <>
        <DayDetailScreen />
        <Probe day="2026-10-06" />
      </>,
    );
    expect(await screen.findByText('Tuesday, 6 Oct')).toBeTruthy();
    expect(await screen.findByText('Morning basics')).toBeTruthy();
    expect(screen.getByLabelText('Morning basics, Not done')).toBeTruthy();
    expect(screen.getByLabelText('Evening basics, Partly done')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('partly 0'));

    const serum = screen.getByRole('checkbox', { name: 'Serum' });
    expect(serum).toHaveProp('accessibilityState', expect.objectContaining({ checked: false }));
    await fireEvent.press(serum);
    await flush();
    expect(getDayLog(app.db, app.evening, '2026-10-06')?.doneStepIds).toEqual(app.ev);
    await waitFor(() => expect(screen.getByLabelText('Evening basics, Done')).toBeTruthy());
    expect(screen.getByRole('checkbox', { name: 'Serum' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: true }),
    );
    // One routine complete: the day now extends the streak; the mark stays partly done.
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('partly 1'));

    await fireEvent.press(screen.getByRole('checkbox', { name: 'SPF' }));
    await flush();
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('done 1'));
    expect(screen.queryByText("Older days can't be changed")).toBeNull();
  });

  it('can untick a step on today', async () => {
    const app = setup(TODAY);
    tickSteps(app.db, app.morning, [app.m[0]!], TODAY, true, app.m);
    await app.render(<DayDetailScreen />);
    const spf = await screen.findByRole('checkbox', { name: 'SPF' });
    await fireEvent.press(spf);
    await flush();
    expect(getDayLog(app.db, app.morning, TODAY)?.doneStepIds).toEqual([]);
    await waitFor(() => expect(screen.getByLabelText('Morning basics, Not done yet')).toBeTruthy());
  });

  it('shows older days read-only, with what was due', async () => {
    const app = setup('2026-09-29');
    await app.render(<DayDetailScreen />);
    expect(await screen.findByText('Tuesday, 29 Sep')).toBeTruthy();
    expect(await screen.findByText("Older days can't be changed")).toBeTruthy();
    expect(screen.getByText('Nothing done · Morning, Evening were due')).toBeTruthy();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByLabelText('Cleanser, not ticked')).toBeTruthy();
    expect(screen.getByLabelText('Evening basics, Not done')).toBeTruthy();
    expect(screen.queryByText(/missed/i)).toBeNull();
  });

  it('keeps the edit window at today and the six days before', async () => {
    const app = setup('2026-10-01');
    await app.render(<DayDetailScreen />);
    expect(await screen.findByRole('checkbox', { name: 'Cleanser' })).toBeTruthy();
    expect(screen.getByText('Nothing done · Morning, Evening were due')).toBeTruthy();
  });

  it('names one routine that was due; 7 days back is read-only', async () => {
    const app = setup('2026-09-30');
    app.db.delete(routine).where(eq(routine.id, app.morning)).run();
    await app.render(<DayDetailScreen />);
    expect(await screen.findByText('Nothing done · Evening was due')).toBeTruthy();
    expect(screen.getByText("Older days can't be changed")).toBeTruthy();
  });

  it('says when nothing was due, and reads in Lithuanian', async () => {
    const app = setup('2026-09-10');
    await setI18nLanguage('lt');
    await app.render(<DayDetailScreen />);
    expect(await screen.findByText('Šią dieną odos rutinų nebuvo numatyta.')).toBeTruthy();
    expect(screen.getByText('Ketvirtadienis, 2026-09-10')).toBeTruthy();
  });

  it('handles a day that is not a date', async () => {
    const app = setup('2026-13-40');
    await app.render(<DayDetailScreen />);
    expect(await screen.findByText("This day can't be shown.")).toBeTruthy();
  });
});
