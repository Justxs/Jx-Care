import { Stack } from 'expo-router';

import { useStackOptions } from '@/navigation/stackOptions';

export default function TabStackLayout() {
  return <Stack screenOptions={useStackOptions()} />;
}
