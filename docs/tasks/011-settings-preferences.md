# 011 Settings list and preferences

**Phase:** B. UI kit and shell · **Depends on:** 010 · **Spec:** S1, S7 · **Design:** [screens.md](../design/screens.md) SettingsScreen, PreferencesScreen

## Goal

The Settings tab with all its groups, and the Preferences screen with language and currency working. Rows for screens built later push to their placeholders.

## Scope

In:

### S1 Settings (`src/features/settings/screens/SettingsScreen.tsx`)

- Title "Settings" (`title-l`), grouped flush cards of `ListRow`s, each group titled above its card:
  - **Care data:** Ingredients, Conflicts, Avoid list
  - **Notifications:** Reminders
  - **Security:** PIN and security
  - **Preferences:** Language (value: "Lietuvių" / "English"), Currency (value: "EUR"), Progress photos
  - **Data:** Backup and restore (value: last backup date or "Never"), Reset app (`tone="danger"`)
  - **About:** Version (from `expo-constants`, `trailing="value"`), Licences (pushes a simple list of open-source licences; generate it at build time or list the main packages by hand, note which under Decisions)
- Rows push their screens (placeholders from task 010 until built). Reset app opens the reset flow from task 018 (until then, a placeholder dialog).

### S7 Preferences (`PreferencesScreen.tsx`)

- **Language:** `ToggleGroup` Lietuvių / English; applies at once through `setLanguage` (task 005); every string on screen re-renders in place with no jump (labels wrap, buttons keep min height).
- **Currency:** `SelectField` with EUR (default), USD, GBP, PLN, then the other ISO codes from `Intl.supportedValuesOf('currency')` if available, else a short list (CHF, SEK, NOK, DKK, CZK). Saved to `settings.currency`; prices everywhere reformat.
- **Progress photos** group: leave a clearly marked section that task 037 fills in (tracked skin angles, hair album, hair angles, last photo as a guide and opacity). Reserve the hair angles row space so switching the album on never jumps the card (design note), even though 037 builds it.

Out:

- Reminders (021), Security (019), Ingredients and Conflicts (029), Avoid list (030), Backup and Reset (040, 018).

## Acceptance criteria

- [ ] Settings shows every group and row from S1 in the right order with LT and EN strings; rows push.
- [ ] Changing language in Preferences switches the whole app immediately and survives a restart.
- [ ] Changing currency reformats a sample price (use the formatter test from task 003 plus a render test of the Preferences screen).
- [ ] Light, dark and 360 pt checked.
- [ ] `npm run check` passes.

## Decisions

(Write any choices you make here.)
