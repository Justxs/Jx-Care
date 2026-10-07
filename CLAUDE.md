# Jx Care

Offline React Native (Expo) app for one person to track skin and hair care products, routines and streaks. LT and EN, behind a PIN, everything stored on the phone.

- Build work is split into tasks: start at [docs/tasks/README.md](docs/tasks/README.md) and read [docs/tasks/conventions.md](docs/tasks/conventions.md) before writing code.
- What to build: [docs/feature-spec.md](docs/feature-spec.md) (wins over [docs/feature-plan.md](docs/feature-plan.md)). How it looks: [DESIGN.md](DESIGN.md) and [docs/design/](docs/design/).
- Commit straight to `main`; no branches or pull requests.
- Before committing: `pnpm check`.
- Updates must never lose data: never edit a migration once it is on main, change the database with `pnpm db:generate`, and follow [docs/releasing.md](docs/releasing.md) for versions and releases.
