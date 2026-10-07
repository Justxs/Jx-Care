import { View } from 'react-native';

import type { SkinDayStatus } from '@/lib/streak';

export type DayMarkProps = {
  status: SkinDayStatus | undefined;
  testID?: string;
};

/**
 * The 12 pt skin day mark. Shapes differ as well as colour: done is a filled accent dot, partly
 * done a half-filled one, not done a grey ring. Pending (today, nothing yet) and none draw
 * nothing but keep the space, so the cell never changes height.
 */
export function DayMark({ status, testID }: DayMarkProps) {
  const id = testID && status ? `${testID}-${status}` : testID;
  if (status === 'done') {
    return <View testID={id} className="h-[12px] w-[12px] rounded-full bg-accent" />;
  }
  if (status === 'partly') {
    return (
      <View
        testID={id}
        className="h-[12px] w-[12px] overflow-hidden rounded-full border-2 border-accent"
      >
        <View className="absolute bottom-0 left-0 top-0 w-1/2 bg-accent" />
      </View>
    );
  }
  if (status === 'missed') {
    return (
      <View testID={id} className="h-[12px] w-[12px] rounded-full border-2 border-ink-muted" />
    );
  }
  return <View testID={id} className="h-[12px] w-[12px]" />;
}
