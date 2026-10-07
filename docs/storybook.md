# Storybook

Every component and screen is documented as stories that run on the phone (Storybook for React Native 10, on-device UI). There is no web build.

## Run it

1. `npm run storybook` (Expo with `EXPO_PUBLIC_STORYBOOK_ENABLED=true`, Storybook telemetry off).
2. Open the dev build (`eas build --profile development`) and go to `jxcare://storybook`: `adb shell am start -a android.intent.action.VIEW -d jxcare://storybook` on Android, `xcrun simctl openurl booted jxcare://storybook` on the iOS simulator, or open the link from any app on the phone. The route sits behind the PIN like every other screen.
3. Pick a story from the sidebar. The bar at the top of every story switches Light/Dark and EN/LT; the choice stays as you move between stories. Controls and Actions are in the addons panel.

Without the flag (`npm start`, release builds) metro replaces every Storybook module with an empty one, the `jxcare://storybook` route redirects home, and the bundle carries no stories (checked with `npx expo export --platform android`).

`.rnstorybook/storybook.requires.ts` is generated: metro rewrites it on `npm run storybook`, and `npm run storybook:generate` does it by hand. It only changes when `.rnstorybook/main.ts` does (stories are found with `require.context`), so new stories need no regeneration. It is committed and left out of oxfmt.

## Write a story

A `*.stories.tsx` file next to the component (`button.tsx` → `button.stories.tsx`, `ProductsScreen.tsx` → `ProductsScreen.stories.tsx`). Titles:

| What | Title |
| --- | --- |
| `src/components/ui/*` | `UI/<Name>` (`UI/Button`) |
| `src/components/*` and a feature's `components/` | `Components/<Area>/<Name>` (`Components/Products/ProductRow`) |
| A feature's `screens/` | `Screens/<Tab>/<Screen>` (`Screens/Products/Products`, `Screens/Settings/Reminders`) |

Cover the main states (empty, filled, loading if it shows a skeleton, error, long Lithuanian text, disabled). One story per state, named for the state.

```tsx
import type { Meta, StoryObj } from '@storybook/react-native';

import { Button } from './button';

const meta = {
  title: 'UI/Button',
  component: Button,
  args: { children: 'Save', variant: 'primary' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    onPress: { action: 'pressed' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Danger: Story = { args: { variant: 'danger', children: 'Delete' } };
```

- Callbacks: `argTypes: { onPress: { action: 'pressed' } }`. Don't import `fn` from `storybook/test`: it doesn't load in Jest.
- Required callbacks (props without `?`): `StoryObj<typeof meta>` wants them in `args`. Spread a typed empty object into the meta args, `args: { ...({} as Pick<Props, 'onPick' | 'onClose'>) }`, and give each an `action` in `argTypes`; the Actions panel then logs them.
- Text that should follow the EN/LT switch: use `useTranslation()` inside a `render` function (see `AllVariants` in `button.stories.tsx`). Literal args (`children: 'Save'`) are fine for controls.
- A story file exports only `default` (the meta) and stories.

### Screens and data-bound components

```tsx
import { withAppData } from '@/storybook/appData';
import { demoIds, seedDemo, seedEmpty } from '@/storybook/fixtures';

const meta = {
  title: 'Screens/Products/Product detail',
  component: ProductDetailScreen,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ProductDetailScreen>;

export const Retinol: Story = {
  decorators: [withAppData({ seed: seedDemo, params: { id: String(demoIds.products.retinol) } })],
};
export const Empty: Story = { decorators: [withAppData({ seed: seedEmpty })] };
```

## API

All under `src/storybook/`.

| Import | What it does |
| --- | --- |
| `withAppData({ seed?, params?, today? })` from `appData` | Story decorator. A fresh in-memory database with every migration, set with `setDb`, seeded with `seed(db, today)`, `appStore.activeDay = today` (default `FIXTURE_TODAY`), the settings query filled as after boot, and `params` returned by `useLocalSearchParams()`. Renders a blank canvas until ready; the app's own database and day come back when the story closes. |
| `withRouteParams(params)` from `decorators` | Route params without a database (a component that reads params). |
| `withPendingData()` from `seeds/pending` | Every query stays pending, so the screen shows its skeletons (Loading stories). |
| `samplePhotoUri` from `seeds/products`, `storyPhotoUri(angle)` from `seeds/progress` | Photos for stories: an inlined product photo, and bundled images for progress photos. |
| `seedDemo(db, today?)`, `seedEmpty(db)` from `fixtures` | The seeds. Write new ones there, only through repo functions. |
| `demoIds` from `fixtures` | Fixed ids `seedDemo` creates (it throws if they drift). |
| `FIXTURE_TODAY` from `fixtures` | `'2026-10-07'`, a Wednesday. |
| `parameters: { layout: 'fullscreen' }` | No padding (screens). Default `'padded'` (16 pt). |
| `setStoryDbFactory(factory)` from `appData` | Where story databases come from: expo-sqlite `:memory:` on the device (`.rnstorybook/preview.tsx`), `createTestDb()` in Jest. |
| `setNavigationLogger(fn)` from `router` | Where logged navigation goes (Actions panel on the device). |

`seedDemo` holds:

| Id | Data |
| --- | --- |
| `products.cleanser` 1 | Skin cleanser, opened, OK |
| `products.vitaminC` 2 | Vitamin C serum (Ascorbic acid), Expiring (12 days) |
| `products.retinol` 3 | Retinol serum, OK, 2 notes, 4 stars, Would buy again |
| `products.glycolicToner` 4 | Glycolic acid toner, Not opened |
| `products.sunscreen` 5 | SPF, Expired |
| `products.moisturiser` 6 | No date |
| `products.shampoo` 7 | Hair, OK |
| `products.conditioner` 8 | Hair, no date, contains Parfum (avoided) |
| `products.clayMask` 9 | Finished 10 days ago, 2 stars, on the shopping list |
| `routines.morning` 1 | Every day, 4 steps, 2 ticked today, 5-day streak |
| `routines.eveningA` 2, `routines.eveningB` 3 | A/B evening, A picked today; B's glycolic acid conflicts with the morning vitamin C (common rules added) |
| `hairTasks.wash` 1 | Every 3 days with shampoo and conditioner, due today, 2 logs |
| `hairTasks.trim` 2 | Every 8 weeks |
| `shoppingItems.clayMask` 1, `hairOil` 2, `hydratingToner` 3, `lipBalm` 4 | Buy again, To buy, Want to try, Bought today |

Also: condition logs on the 4th, 2nd and last day before today, the avoid list (Parfum), and settings with reminders on. No progress photos: `seedProgress` in `seeds/progress` adds Weekly photo and five weeks of check-ins.

## What every story gets

The global decorator (`withStoryShell`, in `.rnstorybook/preview.tsx`) wraps each story in what `app/_layout.tsx` gives a screen: GestureHandlerRootView, SafeAreaProvider, a new QueryClient, BottomSheetModalProvider, the canvas background, the toolbar, ToastHost and PortalHost. Each story gets a new shell (and so a new query client and database).

### expo-router inside stories

While Storybook is enabled, metro resolves `expo-router` imported from `src/` to `src/storybook/expoRouterShim.tsx`: the real module except `router`, `useRouter`, `useLocalSearchParams`, `useNavigation` and `Redirect`. While a story is on screen these log navigation to Actions instead of navigating, return the story's params, give a navigation object whose listeners do nothing, and draw "Redirects to …" instead of redirecting. Outside a story (the rest of the app in a Storybook build) they are the real ones. `useFocusEffect` stays real (the story is a focused screen).

Params reach the story tree only: a bottom sheet or menu rendered through a portal sees the shell's empty params, so pass ids to sheets as props (they already are).

## Tests

`src/storybook/__tests__/stories.test.tsx` finds every `*.stories.tsx` under `src/`, renders each story with its meta and story args, decorators and `render`, waits for its data and fails on a render error, a failed query, or a control a screen reader reaches without a role or a name (a label or text inside; boxes hidden from screen readers are skipped). It runs in `npm run check`, so a broken story fails the build. It mocks `expo-router` with the same stand-ins (`storyExpoRouterMock()`), `expo-haptics`, `expo-crypto` and `expo-camera` (permission refused); add a mock there when a new story needs a native module Jest doesn't have. `fixtures.test.ts` checks that `seedDemo` holds what the table above says.

`src/storybook/compose.tsx` (`composeStory`, `storyEntries`) can render a story in any other test too.

## Notes

- In a Storybook build the app still starts normally (lock, migrations, notifications); Storybook is one more route. While a story with data is open, `getDb()` returns the story database, so anything the app runs in the background then sees the story data.
- The toolbar strings ("Light", "Dark") are developer tooling and not translated, like the old dev gallery.
- Storybook's own UI remembers the last story in `expo-sqlite/kv-store` (a separate file, not the app database).
