import { View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { Chip, ChipGroup } from '@/components/ui/chip';
import { Field } from '@/components/ui/field';
import { ListRow } from '@/components/ui/list-row';
import { Separator } from '@/components/ui/separator';
import type { PhotoAngle } from '@/db/enums';
import { useMotion } from '@/theme/useMotion';

import { useSettings, useUpdateSettings } from '../api';

const SKIN_SIDES: readonly PhotoAngle[] = ['left', 'right'];
const HAIR_ANGLES: readonly PhotoAngle[] = ['front', 'back', 'top'];
const OPACITIES = [0.2, 0.3, 0.4, 0.5] as const;

const percentOf = (opacity: number) => Math.round(opacity * 100);

/**
 * S7 Preferences, progress photos: tracked skin angles (Front always on), the hair album and its
 * angles (their row keeps its space while the album is off, so the card never jumps), and the
 * last photo as a guide with its opacity.
 */
export function ProgressPrefs() {
  const { t } = useTranslation();
  const m = useMotion();
  const settings = useSettings().data;
  const update = useUpdateSettings();
  const albumOn = settings?.hairAlbumOn ?? false;

  const fade = m.timing('base', albumOn ? 'enter' : 'exit');
  const hairRow = useAnimatedStyle(() => ({ opacity: withTiming(albumOn ? 1 : 0, fade) }));

  if (!settings) return null;

  const sides = settings.skinAngles.filter((a) => SKIN_SIDES.includes(a));
  const opacity = percentOf(settings.photoGuideOpacity);

  return (
    <Card title={t('settings.progressPhotos')} flush>
      <Field
        label={t('progress.prefs.skinAngles')}
        hint={t('progress.prefs.skinAnglesHint')}
        className="px-4 pt-3"
      >
        <View
          accessibilityLabel={t('progress.prefs.skinAngles')}
          className="flex-row flex-wrap gap-2"
        >
          {/* Front is always taken: shown chosen, and tapping it changes nothing. */}
          <Chip
            selected
            accessibilityLabel={t('progress.prefs.frontAlways')}
            onPressedChange={() => {}}
          >
            {t('progress.angles.front')}
          </Chip>
          {SKIN_SIDES.map((side) => {
            const on = sides.includes(side);
            return (
              <Chip
                key={side}
                selected={on}
                onPressedChange={() => {
                  const next = on ? sides.filter((a) => a !== side) : [...sides, side];
                  update.mutate({
                    skinAngles: ['front', ...SKIN_SIDES.filter((a) => next.includes(a))],
                  });
                }}
              >
                {t(`progress.angles.${side}`)}
              </Chip>
            );
          })}
        </View>
      </Field>

      <Separator className="ml-4" />
      <ListRow
        label={t('progress.prefs.hairAlbum')}
        detail={t('progress.prefs.hairAlbumDetail')}
        trailing="switch"
        checked={albumOn}
        onCheckedChange={(hairAlbumOn) => update.mutate({ hairAlbumOn })}
      />
      {/* Always laid out, so switching the album only fades it. */}
      <Animated.View
        testID="hair-angles-row"
        style={hairRow}
        pointerEvents={albumOn ? 'auto' : 'none'}
        accessibilityElementsHidden={!albumOn}
        importantForAccessibility={albumOn ? 'auto' : 'no-hide-descendants'}
      >
        <Field
          label={t('progress.prefs.hairAngles')}
          hint={t('progress.prefs.hairAnglesHint')}
          className="px-4 pb-1"
        >
          <ChipGroup
            accessibilityLabel={t('progress.prefs.hairAngles')}
            items={HAIR_ANGLES.map((a) => ({ value: a, label: t(`progress.angles.${a}`) }))}
            value={settings.hairAngles}
            onValueChange={(next) => {
              // At least one hair angle stays on.
              if (next.length === 0) return;
              update.mutate({
                hairAngles: HAIR_ANGLES.filter((a) => next.includes(a)),
              });
            }}
          />
        </Field>
      </Animated.View>

      <Separator className="ml-4" />
      <ListRow
        label={t('progress.prefs.guide')}
        detail={t('progress.prefs.guideDetail')}
        trailing="switch"
        checked={settings.photoGuideOn}
        onCheckedChange={(photoGuideOn) => update.mutate({ photoGuideOn })}
      />
      <Field label={t('progress.prefs.opacity')} className="px-4 pb-1">
        <ChipGroup
          single
          allowEmpty={false}
          accessibilityLabel={t('progress.prefs.opacity')}
          items={OPACITIES.map((o) => ({
            value: String(percentOf(o)),
            label: t('progress.prefs.percent', { value: percentOf(o) }),
          }))}
          value={[String(opacity)]}
          onValueChange={(next) => {
            const value = Number(next[0]);
            if (Number.isFinite(value)) update.mutate({ photoGuideOpacity: value / 100 });
          }}
        />
      </Field>
    </Card>
  );
}
