import { PortalHost } from '@rn-primitives/portal';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { CalendarScreen } from '@/features/calendar/screens/CalendarScreen';
import { DayDetailScreen } from '@/features/calendar/screens/DayDetailScreen';
import { saveSettings } from '@/features/settings/repo';
import { prefetchToday } from '@/features/today/prefetch';
import { TodayScreen } from '@/features/today/screens/TodayScreen';
import { i18n, setI18nLanguage } from '@/i18n';
import { appStore } from '@/state/app';
import { setupTestApp } from '@/test/render';

import { getConditionDay, saveConditionDay } from '../../repo';
import { conditionDayLabel } from '../../labels';

const mockParams: { current: Record<string, string> } = { current: {} };
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
    replace: jest.fn(),
  },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));
// A bottom sheet that shows its content only while presented and reports closing like the real one.
jest.mock('@gorhom/bottom-sheet', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const RN = jest.requireActual<typeof import('react-native')>('react-native');
  const mock = jest.requireActual('@gorhom/bottom-sheet/mock');
  type MockProps = { children: React.ReactNode; onDismiss?: () => void };
  class BottomSheetModal extends React.Component<MockProps, { open: boolean }> {
    state = { open: false };
    present() {
      this.setState({ open: true });
    }
    dismiss() {
      if (!this.state.open) return;
      this.setState({ open: false });
      this.props.onDismiss?.();
    }
    render() {
      if (!this.state.open) return null;
      return React.createElement(RN.View, { testID: 'sheet' }, this.props.children);
    }
  }
  return { ...mock, BottomSheetModal };
});

const Haptics = jest.requireMock<{ impactAsync: jest.Mock }>('expo-haptics');

// Wednesday.
const TODAY = '2026-10-07';
const hidden = { includeHiddenElements: true };

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en', setupHiddenAt: '2026-01-01' });
  appStore.setState((s) => ({ ...s, activeDay: TODAY }));
  return app;
}

const chipNames = (area: 'skin' | 'hair') =>
  within(screen.getByTestId(`condition-chips-${area}`))
    .getAllByRole('button')
    .map((c) => c.props.accessibilityLabel);

const isSelected = (name: string) =>
  screen.getByRole('button', { name }).props.accessibilityState.selected;

beforeEach(async () => {
  await setI18nLanguage('en');
  Haptics.impactAsync.mockClear();
});

describe('Today check-in', () => {
  it('shows the seven skin chips in order and saves a tap at once', async () => {
    const app = setup();
    await prefetchToday(app.client, TODAY);
    await app.render(
      <>
        <TodayScreen />
        <PortalHost />
      </>,
    );

    const card = within(screen.getByTestId('today-section-checkIn'));
    expect(card.getByText('Check-in')).toBeTruthy();
    expect(card.getByText("How's your skin today?")).toBeTruthy();
    expect(chipNames('skin')).toEqual([
      'Calm',
      'Glow',
      'Oily',
      'Dry',
      'Breakout',
      'Redness',
      'Itchy',
    ]);
    expect(card.getByRole('button', { name: 'Hair and note' })).toBeTruthy();
    // No hair chips on Today.
    expect(screen.queryByTestId('condition-chips-hair')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Oily' }));
    expect(isSelected('Oily')).toBe(true);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getConditionDay(app.db, TODAY).skin?.states).toEqual(['oily']));

    await fireEvent.press(screen.getByRole('button', { name: 'Calm' }));
    await waitFor(() =>
      expect(getConditionDay(app.db, TODAY).skin?.states).toEqual(['calm', 'oily']),
    );

    // Untapping both deletes the day's skin row.
    await fireEvent.press(screen.getByRole('button', { name: 'Oily' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Calm' }));
    await waitFor(() => expect(getConditionDay(app.db, TODAY)).toEqual({}));
    expect(isSelected('Calm')).toBe(false);
  });

  it('shows what was saved after a restart', async () => {
    const app = setup();
    saveConditionDay(app.db, TODAY, { skin: { states: ['redness'], note: null } });
    await prefetchToday(app.client, TODAY);
    await app.render(<TodayScreen />);
    expect(isSelected('Redness')).toBe(true);
    expect(isSelected('Calm')).toBe(false);
  });

  it('"Hair and note" opens T4 on Hair for today and saves tags and a note', async () => {
    const app = setup();
    saveConditionDay(app.db, TODAY, { skin: { states: ['glow'], note: null } });
    await prefetchToday(app.client, TODAY);
    await app.render(
      <>
        <TodayScreen />
        <PortalHost />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Hair and note' }));
    const sheet = within(await screen.findByTestId('sheet'));
    expect(sheet.getByText('Condition log')).toBeTruthy();
    expect(sheet.getByText('Today, 7 Oct')).toBeTruthy();

    // The switch counts the picked tags on each side; only the hair chips show.
    const switcher = sheet.getByLabelText('Skin or hair');
    expect(
      within(switcher)
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['Skin, 1', 'Hair, 0']);
    expect(chipNames('hair')).toEqual(['Shiny', 'Frizzy', 'Oily roots', 'Dry ends', 'Flaky scalp']);
    expect(sheet.queryByTestId('condition-chips-skin')).toBeNull();

    await fireEvent.press(sheet.getByRole('button', { name: 'Dry ends' }));
    await fireEvent.press(sheet.getByRole('button', { name: 'Frizzy' }));
    expect(
      within(switcher)
        .getAllByRole('radio')
        .map((r) => r.props.accessibilityLabel),
    ).toEqual(['Skin, 1', 'Hair, 2']);
    await fireEvent.changeText(sheet.getByLabelText('Hair note'), 'Humid day');
    expect(sheet.getByText('9 of 280')).toBeTruthy();

    await fireEvent.press(sheet.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());
    expect(getConditionDay(app.db, TODAY)).toEqual({
      skin: { states: ['glow'], note: null },
      hair: { states: ['frizzy', 'dry_ends'], note: 'Humid day' },
    });
  });
});

describe('C2 condition log', () => {
  it('logs an old past day from "Log how your skin was" and then shows it', async () => {
    const app = setup();
    // Older than the 7-day edit window of routines: condition logs aren't limited.
    const day = '2026-09-20';
    mockParams.current = { day };
    await app.render(
      <>
        <DayDetailScreen />
        <PortalHost />
      </>,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Log how your skin was' }));
    const sheet = within(await screen.findByTestId('sheet'));
    expect(sheet.getByText(/20 Sep/)).toBeTruthy();
    expect(chipNames('skin')).toHaveLength(7);
    await fireEvent.press(sheet.getByRole('button', { name: 'Breakout' }));
    await fireEvent.changeText(sheet.getByLabelText('Skin note'), 'New serum');
    await fireEvent.press(sheet.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByTestId('sheet')).toBeNull());

    expect(getConditionDay(app.db, day)).toEqual({
      skin: { states: ['breakout'], note: 'New serum' },
    });
    const section = within(await screen.findByTestId('condition-day'));
    expect(section.getByText('Breakout')).toBeTruthy();
    expect(section.getByText('New serum')).toBeTruthy();
    expect(section.getByLabelText('Skin: Breakout. New serum')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Log how your skin was' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit condition log' })).toBeTruthy();
  });

  it('shows nothing for a day still to come', async () => {
    const app = setup();
    mockParams.current = { day: '2026-10-09' };
    await app.render(<DayDetailScreen />);
    expect(screen.queryByText('Condition log')).toBeNull();
  });
});

describe('C1 Condition view', () => {
  it('marks logged days with the main state, names every state and shows the legend', async () => {
    const app = setup();
    saveConditionDay(app.db, '2026-10-05', {
      skin: { states: ['oily', 'breakout'], note: null },
    });
    saveConditionDay(app.db, '2026-10-06', { skin: { states: ['calm'], note: null } });
    await app.render(<CalendarScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Condition' }));

    expect(await screen.findByTestId('condition-mark-2026-10-05-breakout', hidden)).toBeTruthy();
    expect(screen.getByTestId('condition-mark-2026-10-06-calm', hidden)).toBeTruthy();
    expect(screen.getByText('+1', hidden)).toBeTruthy();
    expect(screen.getByTestId('day-2026-10-05')).toHaveProp(
      'accessibilityLabel',
      '5 October, breakout and oily',
    );
    expect(screen.getByTestId('day-2026-10-06')).toHaveProp(
      'accessibilityLabel',
      '6 October, calm',
    );
    expect(screen.getByTestId('day-2026-10-07')).toHaveProp(
      'accessibilityLabel',
      '7 October, today',
    );

    const legend = within(screen.getByTestId('condition-legend'));
    for (const word of ['Calm', 'Glow', 'Oily', 'Dry', 'Breakout', 'Redness', 'Itchy']) {
      expect(legend.getByText(word)).toBeTruthy();
    }
    expect(screen.getByRole('button', { name: 'Progress photos' })).toBeTruthy();

    // A new log shows on the grid.
    saveConditionDay(app.db, '2026-10-07', { skin: { states: ['glow'], note: null } });
    await act(async () => {
      await app.client.invalidateQueries({ queryKey: ['condition'] });
    });
    expect(await screen.findByTestId('condition-mark-2026-10-07-glow', hidden)).toBeTruthy();
  });

  it('speaks Lithuanian day labels', async () => {
    await setI18nLanguage('lt');
    expect(conditionDayLabel(i18n.t, '2026-10-05', TODAY, ['breakout', 'oily', 'dry'])).toBe(
      'spalio 5 d., išbėrimai, riebi ir sausa',
    );
  });
});
