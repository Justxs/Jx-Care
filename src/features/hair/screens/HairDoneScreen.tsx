import { useLocalSearchParams } from 'expo-router';

import { HairDoneSheet } from '../components/HairDoneSheet';

/** T3 Hair task done at `/hair/done/[taskId]`: a route, so a hair reminder can open it. */
export function HairDoneScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const id = Number(taskId);
  return <HairDoneSheet taskId={Number.isInteger(id) && id > 0 ? id : 0} />;
}
