# Jx Care Competitor Analysis

Researched 2026-10-06. Living version: [Claude Doc](https://claude.ai/code/artifact/aef7345e-c365-44ed-980b-2b44c61e01dc).

## Summary

No app I found combines skin routines, hair wash scheduling, expiry tracking and your own conflict rules offline in one place, so Jx Care's core plan already stands out. Competitors are split three ways: expiry-only trackers, routine-only trackers, and separate hair apps. None of the ones checked offers a PIN lock or Lithuanian.

Eleven competitor features are worth adding because they work fully offline and fit the existing data model:

1. Per-step schedules inside a routine (e.g. exfoliant only Tue/Fri), which cuts down on routine variants
2. Progress photo diary for skin and hair, with side-by-side compare
3. Quick daily skin/hair condition log plus a reaction note per product
4. Personal "avoid" ingredient list, warned about when adding a product
5. Cost per day of use, from price and opened/finished dates
6. Wait timers between routine steps
7. Hair events beyond washing (trim, colour, treatment cycle) on the hair calendar
8. Small wins: duplicate product, weekly collection digest, "want to try" list

Skip anything that needs a server or online database: barcode lookup, ingredient safety scores, AI face scans, weather/UV tips, community, cloud sync.

## Competitors

Seventeen apps across four groups, from their store pages (developer claims, not hands-on testing). Prices are US store prices on 2026-10-06.

| App | Group | Platforms | Price | Stand-out features |
| --- | --- | --- | --- | --- |
| [Skincare Routine (Mento)](https://apps.apple.com/us/app/skincare-routine/id1428570992) | Routine tracker | iOS, Mac | $3.99 once | Automatic conflict detection, per-day product schedules, application timers, value/ROI stats, photo diary |
| [FeelinMySkin](https://apps.apple.com/us/app/skincare-routine-feelinmyskin/id1526044677) | Routine tracker | iOS, Android | Free + $18.99–39.99/yr | Widget, skin diary with sleep/mood correlations, reactions log, wishlist, 150K product database, hair routines |
| [Skin Bliss](https://apps.apple.com/us/app/skin-bliss-skincare-routines/id1385561364) | Routine tracker | iOS | Free + $34.99/yr | Face scanner, routine player with mirror mode, weather/UV tips, barcode search, expiry tracker |
| [Skincare Routine: Tracker (Coddykit)](https://play.google.com/store/apps/details?id=com.coddykit.skincare&hl=en_US) | Routine tracker | Android | Free + Pro | Calendar heatmap and streaks, low-stock flag, conflict alerts, seasonal routines |
| [SkinSort](https://apps.apple.com/us/app/skinsort-the-skincare-app/id6478040418) | Routine + ingredients | iOS | Free + $19.99–59.99/yr | Photo ingredient breakdown, combination alerts, cheaper-alternative suggestions |
| [TroveSkin](https://www.troveskin.com/) | AI skin analysis | Not confirmed | Not confirmed | Selfie skin analysis, diary, challenges |
| [Beauty Expiry](https://play.google.com/store/apps/details?id=app.sucandigital.beautyexpiry&hl=en_US) | Expiry tracker | Android | Free + Premium | Period-after-opening or fixed expiry, CSV/PDF export, duplicate item, no data collected |
| [CosmeTick](https://apps.apple.com/us/app/cosmetick-expiry-tracker/id6751162352) | Expiry tracker | iOS | Free + Premium | Barcode add, weekly collection check-in, CSV export |
| [PaoUp](https://apps.apple.com/us/app/paoup-beauty-expiry-tracker/id6737193953) | Expiry tracker | iOS | Free + $21.99/yr | Quick add, product photos, custom reminder timing |
| [Yuka](https://apps.apple.com/us/app/yuka-food-cosmetic-scanner/id1092799236) | Ingredient scanner | iOS | Free + Premium | Barcode scan of ~2M cosmetics, risk score, alternatives |
| [INCI Beauty](https://apps.apple.com/us/app/inci-beauty-cosmetic-scanner/id1276113963) | Ingredient scanner | iOS, Android | Free + $14.99/yr | Personal allergen exclusions, offline scanning (Premium) |
| [OnSkin](https://apps.apple.com/us/app/onskin-beauty-product-scanner/id1630768985) | Ingredient scanner | iOS, Android | Free + up to $39.99 | Shelf scan, Hair Lab for shampoos, UV index |
| [Think Dirty](https://apps.apple.com/app/id687176839) | Ingredient scanner | iOS | Free + tiers | Toxicity rating, allergen and acne-trigger alerts |
| [HairDiary](https://apps.apple.com/us/app/hairdiary-hair-care-journal/id6773477489) | Hair | iOS | Free + $7.99/yr | Washes, trims, toning log; daily hair condition; auto weather; streak freeze; widget |
| [Hair Care Routine 360](https://apps.apple.com/us/app/hair-care-routine-360/id6742663422) | Hair | iOS | Free | Wash calendar, hydration/nutrition/reconstruction cycle, growth photos |
| [Curl Compass](https://apps.apple.com/us/app/curl-compass/id6477861467) | Hair | iOS | Free + Pro | Wash-day journal, supplements, which products help or hurt |

Also checked: [Curltine](https://play.google.com/store/apps/details?id=com.curltine&hl=en_US) (Android), which offers an AI hair scan and a weather-adjusted wash schedule.

## Feature ideas

Eleven features to add, four for later, seven to skip. The test was whether a feature works fully offline for one person and fits the planned data model. The Verdict column is a dropdown, so you can change any call.

| Feature | Seen in | Verdict | Why, and how it fits Jx Care |
| --- | --- | --- | --- |
| Per-step schedule inside a routine (weekdays or every N days) | Mento, FeelinMySkin | Add | One Evening routine with "exfoliant Tue/Fri" replaces several near-identical variants. Adds an optional schedule to routine_step |
| Progress photo diary with side-by-side compare | FeelinMySkin, Skin Bliss, Mento, HairDiary, Curl Compass | Add | The main way people see if a routine works. Photos stay on the phone; separate skin and hair albums |
| Daily skin/hair condition log | FeelinMySkin, Skin Bliss, HairDiary | Add | One tap rating (e.g. calm/oily/dry/breakout) plus a note on the calendar day; later shows patterns next to routines used |
| Product reaction note and personal rating | FeelinMySkin, Skin Bliss | Add | Records "broke me out" or "loved it" per product; feeds the re-buy decision on the shopping list |
| Personal "avoid" ingredient list | INCI Beauty, Think Dirty, FeelinMySkin | Add | Reuses the ingredient list; warns when adding a product that contains one. Very small on top of conflicts |
| Cost per day of use | Mento (value/ROI) | Add | Price divided by days between opened and finished, so no quantity tracking needed. Shown on archived products |
| Wait timer between steps | Mento, Skin Bliss | Add | Optional seconds per step (e.g. let an acid absorb); a countdown while ticking off the routine |
| Hair events beyond washing (trim, colour, treatments) | HairDiary, Hair Care Routine 360 | Add | Hair tasks without products, every N weeks, with "last trim 7 weeks ago" on the hair view |
| Duplicate a product | Beauty Expiry | Add | One-tap copy when buying a second of the same thing |
| Weekly collection digest notification | CosmeTick | Add | One weekly summary: expiring soon, expired, unopened |
| "Want to try" list | FeelinMySkin, Skin Bliss | Add | A third section on the shopping list, so ideas don't clutter what you actually need |
| Home-screen widget for today's routine | FeelinMySkin, HairDiary, SkinSort | Later | Useful, but needs native widget code per platform. After the core app works |
| CSV export of products | Beauty Expiry, CosmeTick | Later | JSON backup already planned; CSV is a small add for opening in Excel |
| Streak freeze | HairDiary | Later | Lets one missed day not break a streak; nice once streaks exist |
| Hair treatment cycle (hydration, nutrition, reconstruction) | Hair Care Routine 360 | Later | Can be modelled later as rotating hair tasks if you use such a cycle |
| Barcode scan to add products | CosmeTick, Yuka, INCI Beauty, Skin Bliss | Skip | Needs an online product database, which breaks local-only. Duplicate product covers re-buys |
| Ingredient safety scores and database | Yuka, INCI Beauty, Think Dirty, OnSkin, SkinSort | Skip | Needs a large online database; your own conflict and avoid lists do the job offline |
| AI face or hair photo analysis | Skin Bliss, TroveSkin, Curltine | Skip | Needs a server or heavy models; the photo diary gives the honest version |
| Weather or UV-based tips | Skin Bliss, OnSkin, HairDiary, Curltine | Skip | Needs location and internet |
| Low-stock flag | Coddykit | Skip | You chose dates only; "finished" already feeds the shopping list |
| Cloud sync | Mento, HairDiary | Skip | Conflicts with local-only; the JSON backup covers moving phones |
| Community, reviews, recommendations | FeelinMySkin, SkinSort, OnSkin | Skip | Needs accounts and a server; out of scope for a single-user app |

## Sources

Each app name in the Competitors table links to the store page or site that was opened on 2026-10-06. Features come from those pages, not from testing the apps. TroveSkin's platforms and price could not be confirmed.
