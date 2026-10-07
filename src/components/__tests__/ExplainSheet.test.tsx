import { fireEvent, screen } from '@testing-library/react-native';

import { setI18nLanguage } from '@/i18n';
import { setupTestApp } from '@/test/render';

import { ConflictExplainSheet, ExplainSheet, MildConflictExplainSheet } from '../ExplainSheet';

beforeEach(async () => {
  await setI18nLanguage('en');
});

describe('ExplainSheet', () => {
  it('shows a title, one line per icon and closes with Close', async () => {
    const app = setupTestApp();
    const onClose = jest.fn();
    await app.render(
      <ExplainSheet
        open
        onClose={onClose}
        title="Skin streak"
        lines={[
          { icon: 'check', text: 'A day counts.' },
          { icon: 'calendar', text: 'Days with nothing set are skipped.' },
        ]}
      />,
    );
    expect(screen.getByRole('header', { name: 'Skin streak' })).toBeTruthy();
    expect(screen.getByText('A day counts.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('explains a conflict with the pair, the days, the note and the actions', async () => {
    const app = setupTestApp();
    const onEditRoutine = jest.fn();
    const onSeeRule = jest.fn();
    await app.render(
      <ConflictExplainSheet
        open
        onClose={() => {}}
        conflict={{
          first: { product: 'Vitamin C serum', routine: 'Morning' },
          second: { product: 'Glycolic toner', routine: 'Evening B' },
          weekdays: [2, 4],
          note: 'Using both on one day can irritate.',
          mild: false,
        }}
        onEditRoutine={onEditRoutine}
        onSeeRule={onSeeRule}
      />,
    );
    expect(screen.getByText('Why this warning')).toBeTruthy();
    expect(
      screen.getByText(
        'Vitamin C serum in Morning and Glycolic toner in Evening B are a conflict pair.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('They meet on Tue, Thu.')).toBeTruthy();
    expect(screen.getByText('Using both on one day can irritate.')).toBeTruthy();
    expect(
      screen.getByText('A and B routines at one time of day are never compared with each other.'),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit the routine' }));
    await fireEvent.press(screen.getByRole('button', { name: 'See the rule' }));
    expect(onEditRoutine).toHaveBeenCalled();
    expect(onSeeRule).toHaveBeenCalled();
  });

  it('explains a mild conflict with the every-few-days step', async () => {
    const app = setupTestApp();
    await app.render(
      <MildConflictExplainSheet
        open
        onClose={() => {}}
        step={{ product: 'Retinol serum', everyNDays: 3 }}
      />,
    );
    expect(
      screen.getByText('Retinol serum runs every 3 days, so the pair only meets on some days.'),
    ).toBeTruthy();
    expect(screen.getByText('On those days the tag is a normal Conflict.')).toBeTruthy();
  });
});
