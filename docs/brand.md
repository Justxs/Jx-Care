# Jx-Care brand

## Logo

A minimal frog with cucumber slices over its eyes: a frog on a spa day. Frogs also breathe through their skin, which ties the mascot to skin care.

- One flat colour, no gradients or outlines, in the same style as the Jx-Finance mark.
- Brand pink: `#d94f87`. Use the white version on pink or dark backgrounds.

## Files

| File | Use |
| --- | --- |
| `assets/brand/logo.svg` | Pink logo for light backgrounds |
| `assets/brand/logo-white.svg` | White logo for pink or dark backgrounds |
| `assets/images/icon.png` | App icon, 1024×1024, white frog on pink |
| `assets/images/adaptive-icon.png` | Android adaptive icon foreground, 1024×1024, transparent; background colour `#d94f87` |
| `assets/images/splash-icon.png` | Splash screen image, pink frog on transparent |
| `assets/images/favicon.png` | Web favicon, 48×48 |

The PNGs are generated from the logo geometry. To regenerate them after a change, run:

```sh
python3 assets/brand/render-icons.py
```

The file names match the Expo template, so `app.json` can point at them directly:

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#d94f87"
      }
    },
    "web": { "favicon": "./assets/images/favicon.png" },
    "plugins": [
      ["expo-splash-screen", { "image": "./assets/images/splash-icon.png", "imageWidth": 200, "backgroundColor": "#ffffff" }]
    ]
  }
}
```
