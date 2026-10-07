import './global.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { LandingPage } from '@/features/landing/landing-page';
import { i18n } from '@/lib/i18n';
import '@/stores/preferences';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root');

createRoot(root).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <LandingPage />
    </I18nextProvider>
  </StrictMode>,
);
