import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { i18n, setI18nLanguage } from './index';

function Probe() {
  const { t } = useTranslation();
  return <Text>{t('common.buyAgain')}</Text>;
}

describe('i18n', () => {
  it('translates and re-renders on language change', async () => {
    await setI18nLanguage('en');
    await render(<Probe />);
    expect(screen.getByText('Buy again')).toBeTruthy();
    await act(async () => {
      await setI18nLanguage('lt');
    });
    expect(screen.getByText('Pirkti dar kartą')).toBeTruthy();
    expect(i18n.language).toBe('lt');
  });
});
