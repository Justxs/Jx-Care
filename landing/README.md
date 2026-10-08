# Jx Care website

The website for Jx Care: a landing page (`/`) and a features page (`/features`) in Lithuanian and English, light and dark, with a drawn Today screen and sample cards instead of screenshots. It follows the Jx-Finance landing page (pink band in place of the blue one, scalloped edge in place of the torn receipt, "In short" facts, feature groups, sign-off and the four doors at the bottom).

It is its own package, separate from the app: Vite 8, React 19 with the React Compiler, Tailwind CSS 4, i18next, TanStack Router, TanStack Store (language and theme, saved in localStorage), lucide-react and Figtree. The app's `pnpm check` ignores this folder.

## Run it

```sh
cd landing
pnpm install
pnpm dev        # http://localhost:5173
pnpm storybook  # http://localhost:6006
```

## Check it

```sh
pnpm check      # typecheck, oxlint, oxfmt and vitest
```

## Build it

```sh
pnpm build      # static site in landing/dist
```

Serve `dist/` from the root of a domain. The build also writes `404.html` (a copy of `index.html`), so hosts such as GitHub Pages open `/features` directly; on other hosts, send unknown paths to `index.html`.

## Where things are

| Path | What |
| --- | --- |
| `src/router.tsx` | The two pages (TanStack Router; view transitions morph the pink band between them) |
| `src/features/landing/landing-page.tsx` | Hero, In short, feature overview and privacy sections |
| `src/features/landing/features-page.tsx` | Every feature group with its sample card, text and example |
| `src/features/landing/landing-shell.tsx` | Header, pink band, sign-off, the four doors (GitHub, build guide, feature idea, Ko-fi) and footer |
| `src/features/landing/feature-groups.ts` | Which features sit in which group, and each group's sample card |
| `src/features/landing/showcase/` | The Today phone and the sample cards (fixed sizes, transform and opacity animations only) |
| `src/locales/en.json`, `lt.json` | Every word on the page; a test keeps the keys in step |
| `src/global.css` | Tokens from DESIGN.md (light and dark), type scale and motion |

Rules carried over from the app: tokens and copy rules from [DESIGN.md](../DESIGN.md), no layout shift (fonts preloaded, theme and language set before the first paint, cards rise in at their final size), and Reduce Motion turns every animation off.
