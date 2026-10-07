import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Collapsible } from '@/components/ui/collapsible';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { showToast } from '@/state/ui';

import { useDeleteRule, useGroups, useIngredients, useSaveRule } from '../api';
import { DuplicateRuleError, RULE_NOTE_MAX, type RuleItem } from '../repo';
import { SidePicker, sideOptionKey, useSideLabel, type SideOption } from './SidePicker';

export type ConflictRuleSheetProps = {
  open: boolean;
  onClose: () => void;
  /** The rule to edit; null for a new one. */
  rule: RuleItem | null;
};

type Picking = 'left' | 'right' | null;

/** Groups first, then ingredients, each with a short detail line. */
function useSideOptions(): SideOption[] {
  const { t } = useTranslation();
  const ingredients = useIngredients().data;
  const groups = useGroups().data;
  return useMemo(
    () => [
      ...(groups ?? []).map((g) => ({
        kind: 'group' as const,
        id: g.id,
        name: g.name,
        detail:
          g.memberCount > 0
            ? t('ingredients.members', { count: g.memberCount })
            : t('ingredients.noMembers'),
      })),
      ...(ingredients ?? []).map((i) => ({
        kind: 'ingredient' as const,
        id: i.id,
        name: i.name,
        detail: i.groupName ? t('ingredients.groupSheet.inGroup', { group: i.groupName }) : null,
      })),
    ],
    [groups, ingredients, t],
  );
}

/**
 * S3 rule editor: two side pickers (ingredients and groups together) and a note. Saving re-checks
 * every routine and opens a callout with how many it affects; Done then closes. Mount with a new
 * `key` each time it opens.
 */
export function ConflictRuleSheet({ open, onClose, rule }: ConflictRuleSheetProps) {
  const { t } = useTranslation();
  const spoken = useSideLabel();
  const options = useSideOptions();
  const save = useSaveRule();
  const remove = useDeleteRule();
  const [left, setLeft] = useState<SideOption | null>(rule?.left ?? null);
  const [right, setRight] = useState<SideOption | null>(rule?.right ?? null);
  const [note, setNote] = useState(rule?.note ?? '');
  const [picking, setPicking] = useState<Picking>(null);
  const [error, setError] = useState<string | null>(null);
  const [affected, setAffected] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const saved = affected !== null;

  const changed =
    (left ? sideOptionKey(left) : null) !== (rule ? sideOptionKey(rule.left) : null) ||
    (right ? sideOptionKey(right) : null) !== (rule ? sideOptionKey(rule.right) : null) ||
    note.trim() !== (rule?.note ?? '');

  const onSave = async () => {
    if (!left || !right) return;
    if (sideOptionKey(left) === sideOptionKey(right)) {
      setError(t('conflicts.sheet.sameSides'));
      return;
    }
    try {
      const result = await save.mutateAsync({
        id: rule?.id ?? null,
        leftKind: left.kind,
        leftId: left.id,
        rightKind: right.kind,
        rightId: right.id,
        note: note.trim() || null,
      });
      setPicking(null);
      setAffected(result.affected);
    } catch (e) {
      if (e instanceof DuplicateRuleError) setError(t('conflicts.sheet.duplicate'));
      else throw e;
    }
  };

  const pick = (side: 'left' | 'right') => (o: SideOption) => {
    setError(null);
    (side === 'left' ? setLeft : setRight)(o);
  };

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        dirty={!saved && changed}
        title={rule ? t('conflicts.sheet.titleEdit') : t('conflicts.sheet.titleNew')}
        footer={
          saved ? (
            <Button onPress={onClose}>{t('common.done')}</Button>
          ) : (
            <Button disabled={!left || !right} loading={save.isPending} onPress={onSave}>
              {t('conflicts.sheet.save')}
            </Button>
          )
        }
      >
        <SidePicker
          label={t('conflicts.sheet.left')}
          value={left}
          options={options}
          open={picking === 'left'}
          onOpenChange={(o) => setPicking(o ? 'left' : null)}
          onChange={pick('left')}
          disabled={saved}
        />
        <SidePicker
          label={t('conflicts.sheet.right')}
          value={right}
          options={options}
          open={picking === 'right'}
          onOpenChange={(o) => setPicking(o ? 'right' : null)}
          onChange={pick('right')}
          error={error ?? undefined}
          disabled={saved}
        />
        <Input
          label={t('conflicts.sheet.note')}
          hint={t('conflicts.sheet.noteHint')}
          placeholder={t('conflicts.sheet.notePlaceholder')}
          value={note}
          onChangeText={setNote}
          maxLength={RULE_NOTE_MAX}
          editable={!saved}
          onFocus={() => setPicking(null)}
        />
        <Collapsible open={saved}>
          {affected !== null ? <AffectedCallout count={affected} /> : null}
        </Collapsible>
        {rule && !saved ? (
          <Button variant="ghost" icon="trash-2" onPress={() => setConfirmDelete(true)}>
            {t('conflicts.sheet.delete')}
          </Button>
        ) : null}
      </Sheet>
      {rule ? (
        <AlertDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t('conflicts.sheet.deleteTitle')}
          description={t('conflicts.sheet.deleteBody', {
            rule: `${spoken(rule.left)} × ${spoken(rule.right)}`,
          })}
          actionLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          destructive
          onAction={async () => {
            setConfirmDelete(false);
            await remove.mutateAsync(rule.id);
            onClose();
            showToast({ message: t('conflicts.deletedToast') });
          }}
        />
      ) : null}
    </>
  );
}

/** "Affects 2 routines" in a warning callout, or a quiet "Doesn't affect any routine now". */
function AffectedCallout({ count }: { count: number }) {
  const { t } = useTranslation();
  const hits = count > 0;
  return (
    <View
      testID="rule-affected"
      className={cn(
        'min-h-[48px] flex-row items-center gap-3 rounded-md px-4 py-3',
        hits ? 'bg-warning-soft' : 'bg-subtle',
      )}
    >
      <Icon
        name={hits ? 'alert-triangle' : 'circle-check'}
        size={20}
        tone={hits ? 'warning' : 'ink-muted'}
      />
      <Text
        accessibilityLiveRegion="polite"
        className={cn('flex-1 text-body-strong tabular-nums', hits ? 'text-warning' : 'text-ink')}
      >
        {hits ? t('conflicts.sheet.affects', { count }) : t('conflicts.sheet.affectsNone')}
      </Text>
    </View>
  );
}
