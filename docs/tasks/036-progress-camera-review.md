# 036 Progress camera and review

**Phase:** K. Progress photos · **Depends on:** 020, 025, 035 · **Spec:** C4, C5, T1 (Check-in card, photo row), Notifications (Weekly photo), S5 (weekly photo settings), sequence 8 · **Design:** [screens.md](../design/screens.md) ProgressCameraScreen, PhotoReviewScreen, TodayScreen; [tokens.json](../design/tokens.json) and [nativewind.md](../design/nativewind.md) `camera-*` tokens

## Goal

Taking this week's progress photos with last week's photo as a guide, rating the week, and the weekly prompt in Today's Check-in card and as a notification.

## Scope

In: `npx expo install expo-camera`; add the `expo-camera` plugin with camera permission text (EN "Jx-Care uses the camera for your weekly progress photos. They stay in the app."). Files: `src/features/progress/screens/CameraScreen.tsx`, `ReviewScreen.tsx`, `components/WeeklyPhotoRow.tsx`, `reminders.ts`, `captureSession.ts` (TanStack Store holding the photos taken in this session until saved).

### C4 Progress camera (`/progress/camera?area=skin`)

- Full-screen front camera (`CameraView`, `facing="front"`, flash off), slide up 300 ms. The camera is always dark, in both themes, and every colour comes from the `camera-*` tokens (no hard-coded colours): `camera-bg` #120D10 for the screen, `camera-control` rgba(255,255,255,0.14) for the round buttons and the angle pill, `camera-guide` rgba(240,168,137,0.30) for the last photo guide, `camera-frame` rgba(255,255,255,0.75) for the dashed face outline. Add the tokens to the theme (task 002) if they are missing. Ask for camera permission in context on first open; if denied, a plain screen explaining it with "Open phone settings".
- **Last photo as a guide:** last week's photo for this angle (`useLastPhoto`, task 035) over the preview at `settings.photoGuideOpacity` (default 30%), toggled by the "Show last photo as a guide" icon button (state remembered; default from `settings.photoGuideOn`). A dashed face-oval outline guide in `camera-frame`. Front camera previews are mirrored; mirror the guide the same way so they line up, and save the photo un-mirrored (note what you did under Decisions).
- Angle label at the top ("Front", then "Left side", "Right side" for the tracked skin angles in `settings.skinAngles`; hair: Front, Back, Top from `settings.hairAngles`), and a tips row "Same light · no makeup · hair back".
- Shutter (spoken "Take photo"), then a quick preview with Retake / Use photo; switch camera button. After each angle, the next; after the last, review. Photos are kept as temp files in `captureSession` until saved; closing the camera asks "Discard these photos?".

### C5 Photo review + rating (`/progress/review`)

- Title names the photo by its date ("Skin photo, 6 Oct"), never a week number. Thumbnails of every angle in 3:4 `PhotoTile`s (tap to retake that angle), `Rating` 1–5 stars, tag chips (the seven skin tags in the standard order: Calm, Glow, Oily, Dry, Breakout, Redness, Itchy), note (max 280). Save → `useSaveCheckIn` (task 035 moves files into private storage), then the toast "Saved privately in Jx-Care" and the Progress photos screen (task 037; Today until then).

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

(Write any choices you make here.)
