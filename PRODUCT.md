# PRODUCT.md: Jx Care

## Purpose

Jx Care helps one person look after their skin and hair: which products they own and when each expires, what to put on in the morning and evening, when to wash or treat their hair, and how their skin changes week to week. It answers "what do I need to do today?" in one glance.

## Who uses it

A single owner on their own phone (iOS and Android, portrait). They use it at the bathroom shelf, often with wet hands, morning and evening, for a minute at a time. They read Lithuanian or English.

## Constraints

- Local only: no account, no server, nothing leaves the phone except a backup file the person exports. Progress photos never go to the phone gallery.
- Behind a 4-digit PIN (with Face ID or fingerprint if they want), recovery question for a forgotten PIN.
- Two languages, LT and EN; Lithuanian runs about 20 to 30% longer.
- Light and dark, following the phone.
- Built with React Native (Expo), TanStack Query/Store/Form, SQLite, rn-primitives and NativeWind 4.2.

## Voice

Calm and plain, like a tidy bathroom shelf. Says what happens ("Mark as done", "Add to shopping list"). Warnings, never orders: "Retinol conflicts with AHA in Evening B (Tue)." No medical claims, no emoji, no hype.

## Design principles

1. One thing to do per screen; the filled pink button is that thing.
2. Calm by default: neutral surfaces, colour only for meaning (pink = action, peach/lavender = skin/hair, green/amber/red = expiry).
3. Nothing jumps: every screen paints at its final size and moves smoothly (Justas, 2026-10-06).
4. Words over decoration: labels and real content instead of icon badges, sparkles and overlines.

## Evidence

Feature spec: docs/feature-spec.md (screens O1 to S8). Design system: https://claude.ai/artifact/6wezpPoHNSQoe9bM6GUryU.
