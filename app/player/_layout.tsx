import { Stack } from 'expo-router';

import { useStackOptions } from '@/navigation/stackOptions';

export default function StackLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
