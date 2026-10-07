import { useSelector } from '@tanstack/react-store';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Ellipse } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { AlertDialog } from '@/components/ui/alert-dialog';
import { Icon, type IconName } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { PhotoAngle, ProgressArea } from '@/db/enums';
import { useSettings, useUpdateSettings } from '@/features/settings/api';
import type { AppSettings } from '@/features/settings/repo';
import { isValidDay, weekStart as weekOf } from '@/lib/appDay';
import { cn } from '@/lib/cn';
import { sessionAngles } from '@/lib/weeklyPhoto';
import { appStore } from '@/state/app';
import { showToast } from '@/state/ui';
import { cameraColors } from '@/theme/colors';
import { withAutoLockPaused } from '@/features/security/lock';

import { useLastPhoto } from '../api';
import {
  captureStore,
  clearSession,
  discardTempFile,
  hasPhotos,
  isComplete,
  nextAngle,
  removePhoto,
  setPhoto,
  startSession,
  type CaptureState,
} from '../captureSession';

/** The photo box is 3:4 portrait, the shape every progress photo is saved in. */
const RATIO = 3 / 4;

/** The camera is dark in both themes, so the status bar is always light. */
const STATUS_BAR = 'light' as const;

const leave = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * C4 Progress camera (`/progress/camera?area=skin`, optional `week` for a retake): the front camera
 * with last week's photo as a guide and a face outline, one angle after another, then the review.
 * Always dark: every colour is a `camera-*` token.
 */
export function ProgressCameraScreen() {
  const params = useLocalSearchParams<{ area?: string; week?: string }>();
  const area: ProgressArea = params.area === 'hair' ? 'hair' : 'skin';
  const today = useSelector(appStore, (s) => s.activeDay);
  const weekStart = weekOf(params.week && isValidDay(params.week) ? params.week : today);
  const settings = useSettings().data;
  // The angles as one string, so a new settings object with the same angles changes nothing.
  const angleKey = settings ? sessionAngles(area, settings).join(',') : null;

  useEffect(() => {
    if (angleKey) startSession({ area, weekStart, angles: angleKey.split(',') as PhotoAngle[] });
  }, [area, weekStart, angleKey]);

  const session = useSelector(captureStore, (s) => s);
  const ready = !!settings && session.area === area && session.weekStart === weekStart;

  const [permission, requestPermission] = useCameraPermissions();
  const status = permission?.status;
  const canAsk = permission?.canAskAgain ?? false;
  // Asked in context: the first time the camera opens.
  useEffect(() => {
    if (status === 'undetermined' && canAsk) void withAutoLockPaused(requestPermission);
  }, [status, canAsk, requestPermission]);

  return (
    <View testID="progress-camera" className="flex-1 bg-camera-bg">
      <StatusBar style={STATUS_BAR} />
      {!permission || !ready ? null : permission.granted ? (
        <CameraBody area={area} session={session} settings={settings} />
      ) : (
        <PermissionView
          canAsk={permission.canAskAgain}
          onAllow={() => void withAutoLockPaused(requestPermission)}
        />
      )}
    </View>
  );
}

// ─── Camera ─────────────────────────────────────────────────────────────────

type CameraBodyProps = { area: ProgressArea; session: CaptureState; settings: AppSettings };

function CameraBody({ area, session, settings }: CameraBodyProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const updateSettings = useUpdateSettings();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('front');
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const leaving = useRef(false);
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  const angle = nextAngle(session);
  const lastAngle = session.angles[session.angles.length - 1] ?? 'front';
  const shownAngle: PhotoAngle = angle ?? lastAngle;
  // A photo to check: just taken, or the last one when back from the review.
  const shown = pending ?? (angle === null ? (session.photos[lastAngle] ?? null) : null);
  const live = shown === null;
  const guideOn = settings.photoGuideOn;
  const last = useLastPhoto(area, shownAngle).data ?? null;

  // The camera runs only while this screen is on top (not under the review).
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const close = useCallback(() => {
    if (pendingRef.current) discardTempFile(pendingRef.current);
    setPending(null);
    clearSession({ discard: true });
    leaving.current = true;
    leave();
  }, []);

  const requestClose = () => {
    if (pending || hasPhotos(captureStore.state)) setConfirmOpen(true);
    else close();
  };

  // Android back, or anything else that leaves, asks the same "Discard these photos?".
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (leaving.current) return;
        if (!pendingRef.current && !hasPhotos(captureStore.state)) return;
        e.preventDefault();
        setConfirmOpen(true);
      }),
    [navigation],
  );

  const shoot = async () => {
    if (busy || !camera.current) return;
    setBusy(true);
    try {
      // Saved as the camera sees it (not mirrored); quality is set again when it is stored.
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) setPending(photo.uri);
    } catch {
      showToast({ message: t('progress.camera.takeFailed') });
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    if (pending) {
      discardTempFile(pending);
      setPending(null);
    } else {
      removePhoto(lastAngle);
    }
  };

  const usePhoto = () => {
    if (pending) {
      setPhoto(shownAngle, pending);
      setPending(null);
    }
    if (isComplete(captureStore.state)) router.push('/progress/review');
  };

  const toggleGuide = () => updateSettings.mutate({ photoGuideOn: !guideOn });

  const onBoxArea = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    const w = Math.min(width, height * RATIO);
    setBox({ width: w, height: w / RATIO });
  };

  const angleName = t(`progress.angles.${shownAngle}`);
  const count = session.angles.length;
  const angleLabel =
    count > 1
      ? t('progress.camera.angleStep', {
          angle: angleName,
          index: session.angles.indexOf(shownAngle) + 1,
          count,
        })
      : angleName;

  return (
    <View
      className="flex-1"
      style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="min-h-[56px] flex-row items-center gap-2 px-2">
        <RoundButton icon="x" label={t('a11y.close')} onPress={requestClose} />
        <View className="flex-1 items-center">
          <View className="min-h-[36px] justify-center rounded-full bg-camera-control px-4 py-1.5">
            <Text testID="camera-angle" className="text-center text-label text-camera-ink">
              {angleLabel}
            </Text>
          </View>
        </View>
        <RoundButton
          icon={guideOn ? 'eye' : 'eye-off'}
          label={t('progress.camera.guide')}
          checked={guideOn}
          onPress={toggleGuide}
        />
      </View>

      <View
        testID="camera-box-area"
        className="flex-1 items-center justify-center"
        onLayout={onBoxArea}
      >
        {box ? (
          <View
            testID="camera-box"
            style={{ width: box.width, height: box.height }}
            className="overflow-hidden bg-camera-bg"
          >
            {focused ? (
              <CameraView
                ref={camera}
                testID="camera-view"
                style={StyleSheet.absoluteFill}
                facing={facing}
                flash="off"
                // Not mirrored: the saved photo shows the face as others see it.
                mirror={false}
                ratio="4:3"
                animateShutter={false}
              />
            ) : null}
            {live && guideOn && last ? (
              <Image
                testID="camera-guide"
                source={{ uri: last.fileUri }}
                contentFit="cover"
                accessible={false}
                // The front preview is mirrored, so the guide is mirrored the same way to line up.
                style={[
                  StyleSheet.absoluteFill,
                  {
                    opacity: settings.photoGuideOpacity,
                    transform: [{ scaleX: facing === 'front' ? -1 : 1 }],
                  },
                ]}
              />
            ) : null}
            {live ? <FaceOutline width={box.width} height={box.height} /> : null}
            {shown ? (
              <Image
                testID="camera-preview"
                source={{ uri: shown }}
                contentFit="cover"
                accessibilityLabel={t('progress.camera.preview', { angle: angleName })}
                style={StyleSheet.absoluteFill}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      <Text className="px-4 pt-3 text-center text-caption text-camera-ink">
        {t(area === 'hair' ? 'progress.camera.tipsHair' : 'progress.camera.tipsSkin')}
      </Text>

      <View className="min-h-[116px] flex-row items-center justify-center gap-6 px-4">
        {live ? (
          <>
            <RoundButton
              icon="switch-camera"
              label={t('progress.camera.switchCamera')}
              size="lg"
              onPress={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
            />
            <Pressable
              onPress={() => void shoot()}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={t('progress.camera.shutter')}
              accessibilityState={{ busy }}
              className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-camera-ink active:opacity-85"
            >
              <View className="h-[58px] w-[58px] rounded-full bg-camera-ink" />
            </Pressable>
            <View className="h-[52px] w-[52px]" />
          </>
        ) : (
          <>
            <PillButton label={t('progress.camera.retake')} onPress={retake} className="flex-1" />
            <PillButton
              label={t('progress.camera.usePhoto')}
              strong
              onPress={usePhoto}
              className="flex-1"
            />
          </>
        )}
      </View>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t('progress.camera.discardTitle')}
        description={t('progress.camera.discardBody')}
        actionLabel={t('progress.camera.discard')}
        cancelLabel={t('progress.camera.keep')}
        destructive
        onAction={() => {
          setConfirmOpen(false);
          close();
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </View>
  );
}

/** The dashed face oval, centred a little above the middle. */
function FaceOutline({ width, height }: { width: number; height: number }) {
  return (
    <View testID="camera-face-outline" pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={width} height={height}>
        <Ellipse
          cx={width / 2}
          cy={height * 0.46}
          rx={width * 0.32}
          ry={height * 0.32}
          stroke={cameraColors.frame}
          strokeWidth={2}
          strokeDasharray="8 8"
          fill="none"
        />
      </Svg>
    </View>
  );
}

type RoundButtonProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
  /** A toggle: spoken as a switch, filled with the guide tint while on. */
  checked?: boolean;
  size?: 'md' | 'lg';
};

function RoundButton({ icon, label, onPress, checked, size = 'md' }: RoundButtonProps) {
  const toggle = checked !== undefined;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={toggle ? 'switch' : 'button'}
      accessibilityLabel={label}
      accessibilityState={toggle ? { checked } : undefined}
      hitSlop={size === 'md' ? 4 : undefined}
      className={cn(
        'items-center justify-center rounded-full active:opacity-85',
        size === 'md' ? 'h-[44px] w-[44px]' : 'h-[52px] w-[52px]',
        checked ? 'bg-camera-guide' : 'bg-camera-control',
      )}
    >
      <Icon name={icon} size={size === 'md' ? 22 : 24} color={cameraColors.ink} />
    </Pressable>
  );
}

function PillButton({
  label,
  onPress,
  strong,
  className,
}: {
  label: string;
  onPress: () => void;
  strong?: boolean;
  className?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className={cn(
        'min-h-[52px] items-center justify-center rounded-full px-5 py-3 active:opacity-85',
        strong ? 'bg-camera-ink' : 'bg-camera-control',
        className,
      )}
    >
      <Text
        className={cn(
          'text-center text-body-strong',
          strong ? 'text-camera-bg' : 'text-camera-ink',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Permission ─────────────────────────────────────────────────────────────

/** Camera permission not given: a plain explanation, with Allow camera or Open phone settings. */
function PermissionView({ canAsk, onAllow }: { canAsk: boolean; onAllow: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 px-4"
      style={{ paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }}
    >
      <View className="min-h-[56px] flex-row items-center">
        <RoundButton icon="x" label={t('a11y.close')} onPress={leave} />
      </View>
      <View className="flex-1 justify-center gap-3">
        <Icon name="camera" size={32} color={cameraColors.ink} />
        <Text accessibilityRole="header" className="text-title-m text-camera-ink">
          {canAsk
            ? t('progress.camera.permission.title')
            : t('progress.camera.permission.deniedTitle')}
        </Text>
        <Text className="text-body text-camera-ink">
          {canAsk
            ? t('progress.camera.permission.body')
            : t('progress.camera.permission.deniedBody')}
        </Text>
      </View>
      <PillButton
        strong
        label={
          canAsk
            ? t('progress.camera.permission.allow')
            : t('progress.camera.permission.openSettings')
        }
        onPress={canAsk ? onAllow : () => void Linking.openSettings().catch(() => {})}
      />
    </View>
  );
}
