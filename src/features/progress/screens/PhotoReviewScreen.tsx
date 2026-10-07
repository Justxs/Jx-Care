import { useStore } from '@tanstack/react-form';
import { useSelector } from '@tanstack/react-store';
import { router, useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BOTTOM_BAR_HEIGHT, BottomBar } from '@/components/ui/bottom-bar';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { useAppForm } from '@/components/ui/form';
import { PhotoTile } from '@/components/ui/photo-tile';
import { Rating } from '@/components/ui/rating';
import { ScreenHeader } from '@/components/ui/screen-header';
import type { PhotoAngle, ProgressArea } from '@/db/enums';
import { tagLabel } from '@/features/condition/labels';
import { useFormat } from '@/i18n/useFormat';
import { showToast } from '@/state/ui';

import { useSaveCheckIn } from '../api';
import {
  captureStore,
  clearSession,
  isComplete,
  retakeAngle,
  saveDraft,
  sessionPhotos,
  type CaptureState,
} from '../captureSession';
import { PROGRESS_NOTE_MAX, emptyReview, reviewSchema } from '../schema';
import { progressTags } from '../types';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * C5 Photo review + rating (`/progress/review`): the session's photos (tap one to retake it),
 * a 1–5 rating, the tags and a note. Save moves the photos into private storage.
 */
export function PhotoReviewScreen() {
  const session = useSelector(captureStore, (s) => s);
  const { area, weekStart } = session;
  if (!area || !weekStart || !isComplete(session)) {
    // No photos to review (opened on its own, or just saved and on its way out).
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
        <ScreenHeader title="" onBack={goBack} />
      </SafeAreaView>
    );
  }
  return <ReviewForm session={session} area={area} weekStart={weekStart} />;
}

type ReviewFormProps = { session: CaptureState; area: ProgressArea; weekStart: string };

function ReviewForm({ session, area, weekStart }: ReviewFormProps) {
  const { t } = useTranslation();
  const f = useFormat();
  const navigation = useNavigation();
  const save = useSaveCheckIn();
  const saved = useRef(false);
  const photos = sessionPhotos(session);

  const form = useAppForm({
    schema: reviewSchema,
    defaultValues: session.draft ?? emptyReview,
    onSubmit: async (value) => {
      try {
        await save.mutateAsync({
          area,
          weekStart,
          photos,
          rating: value.rating > 0 ? value.rating : null,
          tags: value.tags,
          note: value.note.trim() || null,
        });
      } catch {
        showToast({ message: t('progress.review.saveFailed') });
        return;
      }
      saved.current = true;
      // The files now live in private storage, so nothing is deleted.
      clearSession({ discard: false });
      showToast({ message: t('progress.review.saved') });
      // Progress photos (task 037) once it exists; Today until then.
      router.dismissTo('/');
    },
  });
  const submitting = useStore(form.store, (s) => s.isSubmitting);

  // Going back to the camera keeps what was filled in, for when the review opens again.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (!saved.current) saveDraft({ ...emptyReview, ...form.state.values });
      }),
    [navigation, form],
  );

  const retake = (angle: PhotoAngle) => {
    saveDraft({ ...emptyReview, ...form.state.values });
    retakeAngle(angle);
    if (router.canGoBack()) router.back();
    else router.replace(`/progress/camera?area=${area}`);
  };

  const title = t(area === 'hair' ? 'progress.review.titleHair' : 'progress.review.titleSkin', {
    date: f.date(f.today),
  });
  const tagItems = progressTags(area).map((tag) => ({
    value: tag,
    label: tagLabel(t, area, tag),
  }));

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-canvas">
      <ScreenHeader title={title} onBack={() => router.back()} />
      <KeyboardAwareScrollView
        bottomOffset={BOTTOM_BAR_HEIGHT + 16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 32 }}
      >
        <Field label={t('progress.review.photos')} hint={t('progress.review.retakeHint')}>
          <View className="flex-row gap-3">
            {photos.map(({ angle, uri }) => {
              const name = t(`progress.angles.${angle}`);
              return (
                <PhotoTile
                  key={angle}
                  src={uri}
                  date={name}
                  accessibilityLabel={t('progress.review.tileLabel', { angle: name })}
                  onPress={() => retake(angle)}
                  className="w-[31%]"
                />
              );
            })}
          </View>
        </Field>

        <form.Field name="rating">
          {(field) => (
            <Field label={t('progress.review.rating')} noHelper className="pb-4">
              <Rating
                value={field.state.value}
                onValueChange={field.handleChange}
                accessibilityLabel={t('progress.review.rating')}
              />
            </Field>
          )}
        </form.Field>

        <form.AppField name="tags">
          {(field) => (
            <field.ChipField label={t('progress.review.tags')} items={tagItems} noHelper />
          )}
        </form.AppField>

        <form.AppField name="note">
          {(field) => (
            <field.TextField
              label={t('progress.review.note')}
              hint={t('progress.review.noteHint')}
              multiline
              maxLength={PROGRESS_NOTE_MAX}
              className="pt-4"
            />
          )}
        </form.AppField>
      </KeyboardAwareScrollView>
      <BottomBar>
        <Button onPress={() => void form.handleSubmit()} loading={submitting}>
          {t('progress.review.save')}
        </Button>
      </BottomBar>
    </SafeAreaView>
  );
}
