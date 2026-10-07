import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { getSettings, saveSettings } from '@/features/settings/repo';
import { setI18nLanguage } from '@/i18n';
import { setupTestApp } from '@/test/render';

import { ProgressPrefs } from '../ProgressPrefs';

function setup() {
  const app = setupTestApp();
  saveSettings(app.db, { language: 'en' });
  return app;
}

beforeEach(async () => {
  await setI18nLanguage('en');
});

describe('S7 progress photo preferences', () => {
  it('tracks the skin sides, with Front always on', async () => {
    const app = setup();
    await app.render(<ProgressPrefs />);

    const front = screen.getByRole('button', { name: 'Front, always on' });
    expect(front).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    await fireEvent.press(front);
    expect(getSettings(app.db).skinAngles).toEqual(['front']);

    await fireEvent.press(screen.getByRole('button', { name: 'Right side' }));
    await waitFor(() => expect(getSettings(app.db).skinAngles).toEqual(['front', 'right']));
    await fireEvent.press(screen.getByRole('button', { name: 'Left side' }));
    await waitFor(() => expect(getSettings(app.db).skinAngles).toEqual(['front', 'left', 'right']));
    await fireEvent.press(screen.getByRole('button', { name: 'Right side' }));
    await waitFor(() => expect(getSettings(app.db).skinAngles).toEqual(['front', 'left']));
  });

  it('keeps the hair angles row laid out while the album is off', async () => {
    const app = setup();
    await app.render(<ProgressPrefs />);

    const row = screen.getByTestId('hair-angles-row', { includeHiddenElements: true });
    expect(row.props.accessibilityElementsHidden).toBe(true);
    expect(row.props.pointerEvents).toBe('none');
    expect(screen.getByText('Photos of your hair, in their own album')).toBeTruthy();

    await fireEvent.press(screen.getByRole('switch', { name: 'Hair album' }));
    await waitFor(() => expect(getSettings(app.db).hairAlbumOn).toBe(true));
    // The same row, now shown: the card keeps its height.
    await waitFor(() =>
      expect(
        screen.getByTestId('hair-angles-row', { includeHiddenElements: true }).props
          .accessibilityElementsHidden,
      ).toBe(false),
    );

    const angles = screen.getByLabelText('Hair angles');
    await fireEvent.press(within(angles).getByRole('button', { name: 'Top' }));
    await waitFor(() => expect(getSettings(app.db).hairAngles).toEqual(['front', 'back']));
  });

  it('keeps at least one hair angle', async () => {
    const app = setup();
    saveSettings(app.db, { hairAlbumOn: true, hairAngles: ['back'] });
    await app.render(<ProgressPrefs />);
    const angles = screen.getByLabelText('Hair angles');
    await fireEvent.press(within(angles).getByRole('button', { name: 'Back' }));
    expect(getSettings(app.db).hairAngles).toEqual(['back']);
  });

  it('saves the guide switch and its opacity', async () => {
    const app = setup();
    await app.render(<ProgressPrefs />);

    const opacity = screen.getByLabelText('Guide opacity');
    expect(within(opacity).getByRole('button', { name: '30%' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ selected: true }),
    );
    await fireEvent.press(within(opacity).getByRole('button', { name: '50%' }));
    await waitFor(() => expect(getSettings(app.db).photoGuideOpacity).toBe(0.5));

    await fireEvent.press(screen.getByRole('switch', { name: 'Last photo as a guide' }));
    await waitFor(() => expect(getSettings(app.db).photoGuideOn).toBe(false));
  });
});
