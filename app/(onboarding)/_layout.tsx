import { Redirect, Stack } from 'expo-router';
import { useState } from 'react';

import { getDb } from '@/db';
import { needsOnboarding } from '@/features/onboarding/gate';
import { useStackOptions } from '@/navigation/stackOptions';

export default function OnboardingLayout() {
  const options = useStackOptions();
  // Decided once when the flow opens: a link into onboarding after setup must not reach Create
  // PIN, while O5 (after O4 has saved) must not be thrown out mid-way.
  const [allowed] = useState(() => needsOnboarding(getDb()));
  if (!allowed) return <Redirect href="/" />;
  return <Stack screenOptions={options} />;
}
