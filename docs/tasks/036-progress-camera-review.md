# 036 Progress camera and review

**Phase:** K. Progress photos · **Depends on:** 020, 025, 035 · **Spec:** C4, C5, T1 (Check-in card, photo row), Notifications (Weekly photo), S5 (weekly photo settings), sequence 8 · **Design:** [screens.md](../design/screens.md) ProgressCameraScreen, PhotoReviewScreen, TodayScreen; [tokens.json](../design/tokens.json) and [nativewind.md](../design/nativewind.md) `camera-*` tokens

## Goal

Taking this week's progress photos with last week's photo as a guide, rating the week, and the weekly prompt in Today's Check-in card and as a notification.

## Scope

In: `npx expo install expo-camera`; add the `expo-camera` plugin with camera permission text (EN "Jx Care uses the camera for your weekly progress photos. They stay in the app."). Files: `src/features/progress/screens/CameraScreen.tsx`, `ReviewScreen.tsx`, `components/WeeklyPhotoRow.tsx`, `reminders.ts`, `captureSession.ts` (TanStack Store holding the photos taken in this session until saved).

### C4 Progress camera (`/progress/camera?area=skin`)

- Full-screen front camera (`CameraView`, `facing="front"`, flash off), slide up 300 ms. The camera is always dark, in both themes, and every colour comes from the `camera-*` tokens (no hard-coded colours): `camera-bg` #120D10 for the screen, `camera-control` rgba(255,255,255,0.14) for the round buttons and the angle pill, `camera-guide` rgba(240,168,137,0.30) for the last photo guide, `camera-frame` rgba(255,255,255,0.75) for the dashed face outline. Add the tokens to the theme (task 002) if they are missing. Ask for camera permission in context on first open; if denied, a plain screen explaining it with "Open phone settings".
- **Last photo as a guide:** last week's photo for this angle (`useLastPhoto`, task 035) over the preview at `settings.photoGuideOpacity` (default 30%), toggled by the "Show last photo as a guide" icon button (state remembered; default from `settings.photoGuideOn`). A dashed face-oval outline guide in `camera-frame`. Front camera previews are mirrored; mirror the guide the same way so they line up, and save the photo un-mirrored (note what you did under Decisions).
- Angle label at the top ("Front", then "Left side", "Right side" for the tracked skin angles in `settings.skinAngles`; hair: Front, Back, Top from `settings.hairAngles`), and a tips row "Same light · no makeup · hair back".
- Shutter (spoken "Take photo"), then a quick preview with Retake / Use photo; switch camera button. After each angle, the next; after the last, review. Photos are kept as temp files in `captureSession` until saved; closing the camera asks "Discard these photos?".

### C5 Photo review + rating (`/progress/review`)

- Title names the photo by its date ("Skin photo, 6 Oct"), never a week number. Thumbnails of every angle in 3:4 `PhotoTile`s (tap to retake that angle), `Rating` 1–5 stars, tag chips (the seven skin tags in the standard order: Calm, Glow, Oily, Dry, Breakout, Redness, Itchy), note (max 280). Save → `useSaveCheckIn` (task 035 moves files into private storage), then the toast "Saved privately in Jx Care" and the Progress photos screen (task 037; Today until then).

### Weekly photo row in Today's Check-in card (fill task 025's slot)

- The photo row at the top of the Check-in card that task 025 builds (above "How's your skin today?"). Shown on `settings.weeklyPhotoWeekday` and the days after until the week's photo is taken or skipped (`useThisWeekStatus`): "This week's skin photo", Take photo (**secondary** button) and a plain "Skip this week" text link under it, so the two never look equal. Skip → `useSkipWeek` and the row collapses; the rest of the card stays. Only when `settings.weeklyPhotoOn`.

### Weekly reminder (planner registered with task 020)

- When `settings.weeklyPhotoOn`: one notification on the chosen weekday and time ("Time for this week's skin photo"), category `weekly_photo` with the action "Skip this week", `data.url` `/progress/camera?area=skin`; none when this week is already taken or skipped. A missed week gets no extra nagging. Add the hair album reminder text when the hair album is on ("…skin and hair photos").
- Turning on Weekly photo for the first time (Reminders screen or the Optional row on Today's setup card) asks for notifications via `askForReminders`.

Out:

- Timeline, week detail, compare and Preferences photo options: 037.

## Acceptance criteria

- [ ] Taking all tracked angles with the guide, reviewing, rating and saving creates the week's entry with photos in private storage (none in the gallery).
- [ ] The guide lines up with the mirrored preview and its opacity follows the setting.
- [ ] The photo row in Today's Check-in card shows on the right day until taken or skipped; Skip this week is a text link and hides the row for the week.
- [ ] The camera uses only the `camera-*` tokens and looks the same in light and dark.
- [ ] Planner tests: weekly reminder on the chosen weekday and time, skipped when taken or skipped, none when off.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

- **Package:** `expo-camera` ~57.0.6 and its config plugin (camera permission text "Jx Care uses the camera for your weekly progress photos. They stay in the app.") were added on main by the integrator; this task added no package.
- **File names:** the routes already pointed at `screens/ProgressCameraScreen.tsx` and `screens/PhotoReviewScreen.tsx` (task 010 placeholders), so those names were kept instead of `CameraScreen.tsx` / `ReviewScreen.tsx`. Other files: `captureSession.ts`, `reminders.ts`, `components/WeeklyPhotoRow.tsx`, `schema.ts` (review form), `useWeeklyPhotoOptional.ts`, and the pure rules in `src/lib/weeklyPhoto.ts` (photo day of a week, when Today's row shows, the angles of a session).
- **Camera tokens:** `camera-control`, `camera-guide` and `camera-frame` were added to `tailwind.config.js` as fixed colours (same in both themes; `camera-bg` was already there). The screen also needs a white for text, icons, the shutter ring and the filled "Use photo" pill, so a fourth fixed token `camera-ink` (#FFFFFF) was added, and `cameraColors.ink` in `src/theme/colors.ts` for the icons and the SVG. The status bar is always light on the camera. The "Discard these photos?" dialog is the app's normal AlertDialog and follows the theme.
- **Where `camera-guide` is used:** the last photo is drawn as itself at `settings.photoGuideOpacity`, so the skin tint marks the guide button while the guide is on (`camera-control` while off).
- **Mirroring:** `CameraView` uses `mirror={false}`, so the saved photo is not mirrored (the face as others see it, the same as every earlier photo). The front camera's live preview is mirrored by the phone, so the guide image is flipped with `scaleX: -1` while the front camera is used and not flipped on the back camera. The quick preview after the shutter shows the photo as it is saved (not mirrored).
- **Lining up:** the preview sits in a 3:4 box (the shape photos are saved in, task 035), sized from the space between the header and the controls, with `ratio="4:3"` so the preview and the photo cover the same area. The guide fills the same box with `contentFit="cover"`. The dashed face oval is an SVG ellipse (64% × 64% of the box, centred a little above the middle) in `camera-frame`.
- **Guide toggle:** "Show last photo as a guide" (a switch for screen readers) saves `settings.photoGuideOn`, so the choice is remembered the next time and matches the Preferences switch (task 037).
- **Angles:** skin is always Front, then Left side and Right side when tracked in `settings.skinAngles`; hair is Front, Back, Top as switched on in `settings.hairAngles` (Front if none). The pill reads "Left side · 2 of 3" when there is more than one angle. The guide is last week's photo of the same angle (`useLastPhoto`). The camera also takes `?week=YYYY-MM-DD` (any day of the week) so task 037's Retake can reuse it; the default is this week.
- **Hair tips:** the spec gives only the skin tips; the hair camera says "Same light · dry hair · same parting".
- **Flow:** Take photo shows the shot with Retake / Use photo; Use photo moves on to the next angle and, after the last, pushes the review. Back from the review shows the last photo again with Retake / Use photo. Tapping a photo on the review sets `captureSession.retake` and goes back to the camera for that angle only. What the review had filled in (rating, tags, note) is kept in the session meanwhile.
- **captureSession** (TanStack Store) holds the area, week, angles, the accepted temp file per angle, the retake angle and the review draft. Opening the camera for the same album and week keeps the photos (back from the review); anything else starts empty and deletes leftover files. Replaced and discarded shots are deleted at once (only files outside the private progress folder). After a save, the files have already moved into private storage, so nothing is deleted.
- **Closing:** X, Android back or any other way out asks "Discard these photos?" ("The photos you just took are deleted. This can't be undone.", Discard / Keep them) when a photo was taken; with none it closes at once. The camera is unmounted while the review is on top.
- **Permission:** asked automatically the first time the camera opens. If it is refused but can be asked again, a plain screen explains it with "Allow camera"; once the phone won't ask again, the same screen says "The camera is off for Jx Care" with "Open phone settings".
- **Review:** titled "Skin photo, 7 Oct" (or "Hair photo, …") with the day it is saved. The photos are 3:4 `PhotoTile`s captioned with the angle. Rating 1–5 stars (unrated is saved as no rating), the seven skin tags in the standard order (the hair album uses the condition log's hair tags and labels, `condition/labels.ts`), and a note (max 280, error under the field). Save calls `useSaveCheckIn`, then shows "Saved privately in Jx Care" and closes the camera flow with `router.dismissTo('/')` (Today). **Task 037:** change that to Progress photos.
- **Today's photo row** (`useWeeklyPhotoSlot`) shows while `weeklyPhotoOn`, from `weeklyPhotoWeekday` to the Sunday of that week, while this week's skin photo is due (`useThisWeekStatus('skin')`, added to `prefetchToday` as `thisWeekStatusQuery`). Take photo is a secondary button; "Skip this week" is a plain 44 pt text link under it. Skip shows "This week's photo skipped" with Undo, which deletes the skipped week again. The row fades out (150 ms); the rest of the Check-in card stays. The row is for skin only. Hair photos are taken from Progress photos (037).
- **Optional row on Today's setup card:** tapping "Weekly progress photo" asks with `askForReminders({ reason: 'weeklyPhoto' })` (task 021), then turns Weekly photo on whatever the answer (S5: choices are kept, and nothing is sent without permission), with the toast "Weekly photo on: Sundays at 10:00" and Undo. If notifications are off in phone settings, the ask shows its own toast instead. Once on, the row reads "On · Sundays at 10:00" and opens Reminders. The Reminders screen (021) already asks through `askForReminders` when its switch is turned on.
- **Reminder planner** (`reminders.ts`, imported from `src/notifications/tasks.ts`): while `weeklyPhotoOn`, one notification per week on the chosen weekday and time (this week and the next two are planned; the scheduler keeps 14 days). Key `weekly_photo:-:weekly_photo:<weekStart>`, title "Weekly photo", body "Time for this week's skin photo", category `weekly_photo`, channel `photos`, `data.url` `/progress/camera?area=skin`. None for a week already taken or skipped, and none once the day and time have passed (a missed week gets no extra nagging). With the hair album on the text is "Time for this week's skin and hair photos", or "…hair photo" when only hair is still due (opening the hair camera). The "Skip this week" button skips every album still due this week. `onWeeklyPhotoChanged` (called after every save, skip and delete) runs `syncEntity('weekly_photo', null)`, and `hairAlbumOn` was added to the settings that re-sync in `start.ts`.
- **No schema change.**

### Check on a real device

- Front camera: the guide (last week's photo) lines up with the live preview on both platforms, mirrored like the preview, and the saved photo is not mirrored. Switch camera: the back camera's guide is not flipped.
- The preview fills the 3:4 box without stretching on Android (`ratio="4:3"`) and iPhone, and the saved photo shows the same area as the preview.
- The guide opacity follows the Preferences setting (20–50%, task 037), and the guide button remembers its state.
- The camera screen looks the same in light and dark (only `camera-*` colours, light status bar), at 360 pt wide and in Lithuanian (the angle pill, "Fotografuoti iš naujo" / "Naudoti nuotrauką" pills, and the tips row wrap without overlapping).
- First open asks for the camera; refusing shows the plain screen; "Open phone settings" opens the app's page.
- Taking all angles, reviewing, rating and saving: the photos are in the app's private folder and **not** in Photos / Gallery; no album appears. The camera's temporary files are gone after Discard and after Save.
- After Save the camera closes to Today (`router.dismissTo('/')`) with the toast. Android back on the camera asks "Discard these photos?".
- Today's photo row: shows on the chosen weekday (and later days that week) until taken or skipped, the row fades out on Skip, and Undo brings it back.
- The weekly reminder arrives on the weekday and time, opens the camera behind the lock, and "Skip this week" from the notification (app closed, background, open) skips the week and hides Today's row.
