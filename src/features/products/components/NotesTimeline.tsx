import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import type { SkinTag } from '@/db/enums';
import { useFormat } from '@/i18n/useFormat';
import { rowEntering, rowExiting, rowLayout } from '@/theme/listMotion';

import { useDeleteNote, useProductNotes } from '../notesApi';
import type { ProductNoteItem } from '../notesRepo';
import { ProductNoteSheet } from './ProductNoteSheet';

/** Small soft pills for a note's skin tags (also used on Day detail). */
export function NoteTags({ tags }: { tags: readonly SkinTag[] }) {
  const { t } = useTranslation();
  if (tags.length === 0) return null;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {tags.map((tag) => (
        <View key={tag} className="min-h-[24px] justify-center rounded-full bg-accent-soft px-2">
          <Text className="text-label text-accent">{t(`common.tags.${tag}`)}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * P2 Notes timeline: dated notes, newest first, each with its tags and text. "Add note" opens
 * P8; tapping a note edits it, and a long press offers Edit and Delete (confirmed in a dialog).
 * New notes fade in at the top.
 */
export function NotesTimeline({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const f = useFormat();
  const notes = useProductNotes(productId);
  const remove = useDeleteNote();
  const [sheet, setSheet] = useState<{
    key: number;
    open: boolean;
    editing: ProductNoteItem | null;
  }>({ key: 0, open: false, editing: null });
  const [menu, setMenu] = useState<{ key: number; open: boolean; note: ProductNoteItem | null }>({
    key: 0,
    open: false,
    note: null,
  });
  // The note stays set while the dialog fades out, so its text doesn't change as it leaves.
  const [del, setDel] = useState<{ open: boolean; note: ProductNoteItem | null }>({
    open: false,
    note: null,
  });

  const openSheet = (editing: ProductNoteItem | null) =>
    setSheet((s) => ({ key: s.key + 1, open: true, editing }));
  const openMenu = (note: ProductNoteItem) =>
    setMenu((m) => ({ key: m.key + 1, open: true, note }));

  const actions = (note: ProductNoteItem) => [
    { key: 'edit', label: t('common.edit'), onPress: () => openSheet(note) },
    { key: 'delete', label: t('common.delete'), onPress: () => setDel({ open: true, note }) },
  ];

  const list = notes.data;

  return (
    <View className="gap-2">
      <View className="min-h-[44px] flex-row items-center justify-between gap-3 pl-1">
        <Text accessibilityRole="header" className="flex-1 text-title-s">
          {t('products.notes.title')}
        </Text>
        <Pressable
          onPress={() => openSheet(null)}
          accessibilityRole="button"
          hitSlop={4}
          className="min-h-[44px] justify-center px-1 active:opacity-85"
        >
          <Text className="text-body-strong text-accent">{t('products.notes.add')}</Text>
        </Pressable>
      </View>

      {!list ? (
        <Skeleton height={88} radius={16} />
      ) : list.length === 0 ? (
        <Card>
          <Text className="text-body text-ink-muted">{t('products.notes.empty')}</Text>
        </Card>
      ) : (
        <LayoutAnimationConfig skipEntering>
          <Animated.View layout={rowLayout}>
            <Card flush>
              {list.map((note, index) => {
                const date = f.date(note.day);
                const tagWords = note.tags.map((tag) => t(`common.tags.${tag}`));
                const rowActions = actions(note);
                return (
                  <Animated.View
                    key={note.id}
                    entering={rowEntering}
                    exiting={rowExiting}
                    layout={rowLayout}
                  >
                    {index > 0 ? <Separator inset /> : null}
                    <Pressable
                      testID={`note-${note.id}`}
                      onPress={() => openSheet(note)}
                      onLongPress={() => openMenu(note)}
                      accessibilityRole="button"
                      accessibilityLabel={[date, ...tagWords, note.text].join(', ')}
                      accessibilityActions={rowActions.map((a) => ({
                        name: a.key,
                        label: a.label,
                      }))}
                      onAccessibilityAction={(e) =>
                        rowActions.find((a) => a.key === e.nativeEvent.actionName)?.onPress()
                      }
                      className="min-h-[56px] gap-2 px-4 py-3 active:bg-accent-soft"
                    >
                      <Text className="text-label tabular-nums text-ink-muted">{date}</Text>
                      <NoteTags tags={note.tags} />
                      <Text className="text-body">{note.text}</Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </Card>
          </Animated.View>
        </LayoutAnimationConfig>
      )}

      <ProductNoteSheet
        key={sheet.key}
        productId={productId}
        open={sheet.open}
        editing={sheet.editing}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />

      {menu.note ? (
        <Sheet
          key={menu.key}
          open={menu.open}
          onClose={() => setMenu((m) => ({ ...m, open: false, note: null }))}
          title={f.date(menu.note.day)}
        >
          <View className="-mx-4">
            {actions(menu.note).map((action) => (
              <ListRow
                key={action.key}
                label={action.label}
                icon={action.key === 'delete' ? 'trash-2' : 'pencil'}
                tone={action.key === 'delete' ? 'danger' : undefined}
                trailing="none"
                onPress={() => {
                  setMenu((m) => ({ ...m, open: false }));
                  action.onPress();
                }}
              />
            ))}
          </View>
        </Sheet>
      ) : null}

      <AlertDialog
        open={del.open}
        onOpenChange={(open) => setDel((d) => ({ ...d, open }))}
        title={t('products.notes.deleteTitle')}
        description={t('products.notes.deleteBody', {
          date: del.note ? f.date(del.note.day) : '',
        })}
        actionLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        destructive
        onAction={() => {
          if (del.note) remove.mutate(del.note.id);
          setDel((d) => ({ ...d, open: false }));
        }}
      />
    </View>
  );
}
