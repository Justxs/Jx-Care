# Jx-Care

Jx-Care helps one person look after their skin and hair: which products they own and when each expires, what to put on in the morning and evening, when to wash or treat their hair, and how their skin changes week to week. It answers "what do I need to do today?" in one glance. Everything stays on the phone, behind a PIN, in Lithuanian or English.

## Run it

```sh
npm install
npx expo start
```

The app uses native modules that are not in Expo Go, so open it in a development build (`npx expo run:android` or `npx expo run:ios`).

## Check it

```sh
npm run check   # typecheck, lint and tests
```

## Build it

Builds run on EAS ([eas.json](eas.json)); sign in once with `npx eas-cli login`.

```sh
npx eas-cli build --profile development --platform android   # dev client for npx expo start
npx eas-cli build --profile preview --platform android       # installable APK
npx eas-cli build --profile preview --platform ios           # ad-hoc IPA (needs an Apple account)
```

Version is 1.0.0; build numbers are set by EAS (`appVersionSource: remote`).

The first build asks to create the EAS project and link it (it writes the project id into `app.json`); say yes and commit that change. After installing a build, walk [docs/device-checklist.md](docs/device-checklist.md).

## Website

The landing page lives in [landing/](landing/README.md), a separate Vite + React package (`cd landing && npm install && npm run dev`).

## Build plan

The work is split into tasks in [docs/tasks/README.md](docs/tasks/README.md). What to build is in [docs/feature-spec.md](docs/feature-spec.md); how it looks is in [DESIGN.md](DESIGN.md) and [docs/design/](docs/design/).
