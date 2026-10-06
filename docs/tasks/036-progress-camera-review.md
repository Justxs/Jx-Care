# 036 Progress camera and review

**Phase:** K. Progress photos · **Depends on:** 020, 025, 035 · **Spec:** C4, C5, T1 (Weekly photo card), Notifications (Weekly photo), S5 (weekly photo settings), sequence 8 · **Design:** [screens.md](../design/screens.md) ProgressCameraScreen, PhotoReviewScreen, TodayScreen

## Goal

Taking this week's progress photos with last week's photo as a guide, rating the week, and the weekly prompt on Today and as a notification.

## Scope

In: `npx expo install expo-camera`; add the `expo-camera` plugin with camera permission text (EN "Jx-Care uses the camera for your weekly progress photos. They stay in the app."). Files: `src/features/progress/screens/CameraScreen.tsx`, `ReviewScreen.tsx`, `components/WeeklyPhotoCard.tsx`, `reminders.ts`, `captureSession.ts` (TanStack Store holding the photos taken in this session until saved).

### C4 Progress camera (`/progress/camera?area=skin`)

- Full-screen front camera (`CameraView`, `facing="front"`, flash off), slide up 300 ms. Ask for camera permission in context on first open; if denied, a plain screen explaining it with "Open phone settings".
- **Last photo as a guide:** last week's photo for this angle (`useLastPhoto`, task 035) over the preview at `settings.photoGuideOpacity` (default 30%), toggled by the "Show last photo as a guide" icon button (state remembered; default from `settings.photoGuideOn`). A face-oval outline guide. Front camera previews are mirrored; mirror the guide the same way so they line up, and save the photo un-mirrored (note what you did under Decisions).
- Angle label at the top ("Front", then "Left side", "Right side" for the tracked skin angles in `settings.skinAngles`; hair: Front, Back, Top from `settings.hairAngles`), and a tips row "Same light · no makeup · hair back".
- Shutter (spoken "Take photo"), then a quick preview with Retake / Use photo; switch camera button. After each angle, the next; after the last, review. Photos are kept as temp files in `captureSession` until saved; closing the camera asks "Discard these photos?".

### C5 Photo review + rating (`/progress/review`)

- Thumbnails of every angle in 3:4 `PhotoTile`s (tap to retake that angle), `Rating` 1–5 stars, tag chips (the seven skin tags: Calm, Glow, Oily, Dry, Breakout, Redness, Itchy), note (max 280). Save → `useSaveCheckIn` (task 035 moves files into private storage), then the toast "Saved privately in Jx-Care" and the timeline (task 037; Today until then).

### Weekly photo card on Today (fill task 025's slot)

- Shown on `settings.weeklyPhotoWeekday` and the days after until the week's photo is taken or skipped (`useThisWeekStatus`): "Time for this week's skin photo", Take photo (**secondary**) / Skip this week (**ghost**). Skip → `useSkipWeek` and the card collapses. Only when `settings.weeklyPhotoOn`.

### Weekly reminder (planner registered with task 020)

- When `settings.weeklyPhotoOn`: one notification on the chosen weekday and time ("Time for this week's skin photo"), category `weekly_photo` with the action "Skip this week", `data.url` `/progress/camera?area=skin`; none when this week is already taken or skipped. A missed week gets no extra nagging. Add the hair album reminder text when the hair album is on ("…skin and hair photos").
- Turning on Weekly photo for the first time (Reminders screen or the Optional row on Today's setup card) asks for notifications via `askForReminders`.

Out:

- Timeline, week detail, compare and Preferences photo options: 037.

## Acceptance criteria

- [ ] Taking all tracked angles with the guide, reviewing, rating and saving creates the week's entry with photos in private storage (none in the gallery).
- [ ] The guide lines up with the mirrored preview and its opacity follows the setting.
- [ ] Today's card shows on the right day until taken or skipped; Skip hides it for the week.
- [ ] Planner tests: weekly reminder on the chosen weekday and time, skipped when taken or skipped, none when off.
- [ ] Light, dark, 360 pt and Lithuanian checked; `npm run check` and `npx expo export --platform android --output-dir /tmp/jx-export` pass.

## Decisions

(Write any choices you make here.)
