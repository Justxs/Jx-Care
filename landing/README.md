# Jx Care website

The website for Jx Care: a landing page (`/`) and a features page (`/features`) in Lithuanian and English, light and dark, with a drawn Today screen and sample cards instead of screenshots. The hero's View demo button opens the real app as a live demo once it is built (below). It follows the Jx-Finance landing page (pink band in place of the blue one, scalloped edge in place of the torn receipt, "In short" facts, feature groups, sign-off and the four doors at the bottom).

It is its own package, separate from the app: Vite 8, React 19 with the React Compiler, Tailwind CSS 4, i18next, TanStack Router, TanStack Store (language and theme, saved in localStorage), lucide-react and Figtree. The app's `pnpm check` ignores this folder.

## Run it

```sh
cd landing
pnpm install
pnpm dev        # http://localhost:5173 (builds the live demo first if it isn't there)
pnpm storybook  # http://localhost:6006
```

## Check it

```sh
pnpm check      # typecheck, oxlint, oxfmt and vitest
```

## Live demo

```sh
pnpm demo       # the app's tab screens for the web, into public/demo (gitignored)
```

`pnpm demo` runs [`../scripts/build-web-demo.mjs`](../scripts/build-web-demo.mjs), which needs the app's own `pnpm install` at the repo root. It exports the app's real Today, Products, Routines, Calendar and Settings screens with Expo for the web, on the same sample data as the app's Storybook, with SQLite in memory (sql.js), so nothing is saved. The source is in [`../src/web-demo`](../src/web-demo). `src/features/landing/showcase/demo-dialog.tsx` opens it in a phone-sized window when the visitor presses View demo (nothing loads before that), and `live-demo.tsx` fades it in once it has drawn; it follows the page's theme and language. `pnpm dev` builds it once when public/demo is missing (run `pnpm demo` to rebuild it after app changes). Without a demo build (a failed build, tests, Storybook) the window stays on its loading line.

## Build it

```sh
pnpm build      # live demo, then the static site in landing/dist
```

Serve `dist/` from the root of a domain (the demo lives at `/demo/`; for a sub-path, set `JX_WEB_DEMO_BASE_URL`, e.g. `/Jx-Care/demo`). The build also writes `404.html` (a copy of `index.html`), so hosts such as GitHub Pages open `/features` directly; on other hosts, send unknown paths to `index.html`.

## Where things are

| Path | What |
| --- | --- |
| `src/router.tsx` | The two pages (TanStack Router; view transitions morph the pink band between them) |
| `src/features/landing/landing-page.tsx` | Hero, In short, feature overview and privacy sections |
| `src/features/landing/features-page.tsx` | Every feature group with its sample card, text and example |
| `src/features/landing/landing-shell.tsx` | Header, pink band, sign-off, the four doors (GitHub, build guide, feature idea, Ko-fi) and footer |
| `src/features/landing/feature-groups.ts` | Which features sit in which group, and each group's sample card |
| `src/features/landing/showcase/` | The Today phone, the View demo window and the sample cards (fixed sizes, transform and opacity animations only) |
| `src/locales/en.json`, `lt.json` | Every word on the page; a test keeps the keys in step |
| `src/global.css` | Tokens from DESIGN.md (light and dark), type scale and motion |

Rules carried over from the app: tokens and copy rules from [DESIGN.md](../DESIGN.md), no layout shift (fonts preloaded, theme and language set before the first paint, cards rise in at their final size), and Reduce Motion turns every animation off.
