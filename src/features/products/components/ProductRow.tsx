import * as DropdownMenuPrimitive from '@rn-primitives/dropdown-menu';
import { useRef } from 'react';
import { Pressable, View, type AccessibilityActionEvent } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTranslation } from 'react-i18next';

import { AreaTag } from '@/components/ui/area-tag';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon, type IconName } from '@/components/ui/icon';
import { MenuPortal } from '@/components/ui/more-menu';
import { ProductThumb } from '@/components/ui/product-thumb';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useFormat } from '@/i18n/useFormat';
import { cn } from '@/lib/cn';

import { dateLine, metaLine, statusBadge } from '../statusText';
import type { ProductListItem } from '../types';

export type RowAction = {
  /** Also the accessibility action name. */
  key: string;
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Accent fill on the swipe button (Mark finished). */
  primary?: boolean;
};

export type ProductRowProps = {
  item: ProductListItem;
  onPress: () => void;
  /** Swipe left and long press. */
  actions?: readonly RowAction[];
  selecting?: boolean;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
};

/** One product in the Products list or the Expiring soon card (72 pt minimum). */
export function ProductRow({
  item,
  onPress,
  actions = [],
  selecting = false,
  selected = false,
  onSelectedChange,
}: ProductRowProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const swipeable = useRef<SwipeableMethods>(null);
  const menu = useRef<DropdownMenuPrimitive.TriggerRef>(null);
  const badge = statusBadge(item, f, t);
  const date = dateLine(item, f, t);
  const meta = metaLine(item, t);
  const canAct = !selecting && actions.length > 0;

  const run = (action: RowAction) => {
    swipeable.current?.close();
    action.onPress();
  };

  const onAccessibilityAction = (e: AccessibilityActionEvent) => {
    const name = e.nativeEvent.actionName;
    if (name === 'activate') return selecting ? onSelectedChange?.(!selected) : onPress();
    const action = actions.find((a) => a.key === name);
    if (action) run(action);
  };

  const spoken = [item.name, meta, date, badge?.label, item.avoid ? t('common.status.avoid') : null]
    .filter(Boolean)
    .join(', ');

  const row = (
    <Pressable
      onPress={selecting ? () => onSelectedChange?.(!selected) : onPress}
      onLongPress={canAct ? () => menu.current?.open() : undefined}
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected } : undefined}
      accessibilityLabel={spoken}
      accessibilityActions={
        canAct ? actions.map((a) => ({ name: a.key, label: a.label })) : undefined
      }
      onAccessibilityAction={onAccessibilityAction}
      testID={`product-row-${item.id}`}
      className="min-h-[72px] flex-row items-center gap-3 bg-surface px-4 py-3 active:bg-subtle"
    >
      {selecting ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Checkbox checked={selected} onCheckedChange={(c) => onSelectedChange?.(c)} />
        </View>
      ) : null}
      <ProductThumb src={item.photoUri} category={item.category} />
      <View className="flex-1 gap-0.5">
        <Text className="text-body-strong">{item.name}</Text>
        <Text numberOfLines={1} className="text-caption text-ink-muted">
          {meta}
        </Text>
        {date ? <Text className="text-caption text-ink-muted">{date}</Text> : null}
      </View>
      <View className="shrink-0 items-end gap-1">
        <AreaTag area={item.area} />
        {badge ? <Badge status={badge.status}>{badge.label}</Badge> : null}
        {item.avoid ? <Badge status="avoid" /> : null}
      </View>
      {/* Invisible anchor: long press opens the actions menu here. */}
      <DropdownMenuPrimitive.Trigger
        ref={menu}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        className="absolute right-4 top-3 h-px w-px"
      />
    </Pressable>
  );

  return (
    <DropdownMenuPrimitive.Root>
      <ReanimatedSwipeable
        ref={swipeable}
        enabled={canAct}
        friction={2}
        rightThreshold={40}
        overshootRight={false}
        renderRightActions={() => <SwipeActions actions={actions} onRun={run} />}
      >
        {row}
      </ReanimatedSwipeable>
      <MenuPortal
        items={actions.map((a) => ({ label: a.label, icon: a.icon, onPress: a.onPress }))}
      />
    </DropdownMenuPrimitive.Root>
  );
}

function SwipeActions({
  actions,
  onRun,
}: {
  actions: readonly RowAction[];
  onRun: (a: RowAction) => void;
}) {
  return (
    <View className="flex-row" importantForAccessibility="no-hide-descendants">
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => onRun(a)}
          accessible={false}
          className={cn(
            'w-[80px] items-center justify-center gap-1 px-1 active:opacity-85',
            a.primary ? 'bg-accent' : 'bg-subtle',
          )}
        >
          <Icon name={a.icon} size={20} tone={a.primary ? 'on-accent' : 'ink'} />
          <Text
            numberOfLines={2}
            className={cn('text-center text-label', a.primary ? 'text-on-accent' : 'text-ink')}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Product rows at their final 72 pt height while a list loads (P1, P5). */
export function ProductRowsSkeleton({ rows }: { rows: number }) {
  return (
    <Card flush>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i}>
          {i > 0 ? <Separator inset /> : null}
          <View className="min-h-[72px] flex-row items-center gap-3 px-4 py-3">
            <Skeleton width={48} height={48} radius={8} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={12} />
            </View>
          </View>
        </View>
      ))}
    </Card>
  );
}
