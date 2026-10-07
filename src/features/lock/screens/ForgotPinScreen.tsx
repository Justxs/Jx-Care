import { useTranslation } from 'react-i18next';

import { PlaceholderScreen } from '@/features/shell/PlaceholderScreen';

/** L2 Forgot PIN. Placeholder until task 018. */
export function ForgotPinScreen() {
  const { t } = useTranslation();
  return <PlaceholderScreen specId="L2" title={t('screens.forgotPin')} task="018" nav="back" />;
}
