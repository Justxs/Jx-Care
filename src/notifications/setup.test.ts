import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { i18n } from '@/i18n';

import { categoryDefs, channelDefs, setupNotifications } from './setup';

const en = i18n.getFixedT('en');
const lt = i18n.getFixedT('lt');

describe('channels and categories', () => {
  it('names the five Android channels from i18n', () => {
    expect(channelDefs(en).map((c) => [c.id, c.name])).toEqual([
      ['expiry', 'Expiry'],
      ['routines', 'Routines'],
      ['hair', 'Hair care'],
      ['photos', 'Weekly photo'],
      ['digest', 'Weekly digest and backup'],
    ]);
    expect(channelDefs(lt)[2]!.name).toBe('Plaukų priežiūra');
  });

  it('gives each category the buttons from the spec, run without opening the app', () => {
    const defs = categoryDefs(en);
    expect(defs.map((c) => [c.id, c.actions.map((a) => a.buttonTitle)])).toEqual([
      ['expiry_warning', ['Buy again']],
      ['expiry_day', ['Mark finished']],
      ['routine', ['Snooze']],
      ['hair', ['Done', 'Snooze']],
      ['other_care', ['Done']],
      ['weekly_photo', ['Skip this week']],
    ]);
    expect(
      defs.flatMap((c) => c.actions).every((a) => a.options?.opensAppToForeground === false),
    ).toBe(true);
    expect(categoryDefs(lt)[3]!.actions.map((a) => a.buttonTitle)).toEqual(['Atlikta', 'Atidėti']);
  });
});

describe('setupNotifications', () => {
  const original = Platform.OS;
  afterEach(() => {
    Platform.OS = original;
    jest.mocked(Notifications.setNotificationChannelAsync).mockClear();
    jest.mocked(Notifications.setNotificationCategoryAsync).mockClear();
  });

  it('registers channels on Android and categories, in the given language', async () => {
    Platform.OS = 'android';
    await setupNotifications(lt);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(5);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'routines',
      expect.objectContaining({
        name: 'Rutinos',
        importance: Notifications.AndroidImportance.HIGH,
      }),
    );
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledTimes(6);
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('weekly_photo', [
      expect.objectContaining({ identifier: 'skip_week', buttonTitle: 'Praleisti šią savaitę' }),
    ]);
  });

  it('has no channels on iOS', async () => {
    Platform.OS = 'ios';
    await setupNotifications(en);
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledTimes(6);
  });

  it('shows banners in the foreground without sound', async () => {
    await setupNotifications(en);
    const handler = jest.mocked(Notifications.setNotificationHandler).mock.calls.at(-1)![0]!;
    await expect(
      handler.handleNotification({} as Notifications.Notification),
    ).resolves.toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
    });
  });
});
