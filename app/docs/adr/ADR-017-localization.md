# ADR-017 — Localization: Finnish and English, chosen by the operating system

- **Status:** Accepted
- **Date:** 2026-10-08
- **Deciders:** Project owner (requirement), engineering (mechanism)

## Context

The app is built for Finland's berry season, and the owner requires it to speak
**Finnish and English** now, with **Swedish to follow**. The design already assumes
this: screen 01's footer reads “Made for Finland's berry season · EN / FI”. The design
file, however, contains **no Finnish copy** — every frame is authored in English.

Until now the app had no localization at all: copy was written as literals inside
components and screens, and the screen tests assert those literals as the frame's own
words. Copy is therefore the one part of a screen that the design system did not own,
while being the part a user reads first.

## Decision

1. **`expo-localization` for the device's languages, and typed catalogues in the
   repository** (`src/services/i18n/`). English is the **source language**: its
   catalogue defines the key type, and every other catalogue is typed against it, so a
   string added to the app cannot be left untranslated without a compile error.
   `SUPPORTED_LOCALES` is the single list of shipped languages.
2. **The operating system chooses the language, not the app.** `app.json` declares
   `supportedLocales: ['en', 'fi']` through the `expo-localization` config plugin, so
   iOS and Android offer the app in their own per-app language settings, and the choice
   reaches the app through `useLocales()` — which also re-renders when the setting
   changes, the behaviour Android needs because it does not restart the app.
   **There is deliberately no in-app language picker.**
3. **Resolution rule:** the first device language tag the app speaks wins, matched by
   its language subtag and case-insensitively (BCP 47); anything else falls back to
   English. A Sweden-Finnish device (`sv-SE`, `fi-FI`, `en-US`) therefore gets Finnish
   rather than the fallback.
4. **Every user-visible string is looked up by key** (`onboarding.welcome.title`), never
   written as a literal in a component. `PASSWORD_HINT` left the domain module for this
   reason: the rule stayed in the domain, its wording moved to the catalogue.
5. **What integrality the tests enforce:** every key present and non-empty in every
   locale, no stray keys, placeholders kept in step across locales. Translation
   *wording* is not testable and needs a human review.

## Alternatives considered

- **`i18n-js`, as in Expo's localization guide.** Straightforward, but it looks strings
  up by key at runtime against untyped data: a typo or a missing translation becomes a
  blank label at runtime instead of a failed typecheck. Its interpolation and
  pluralisation features are unused here.
- **react-i18next, Lingui or Intlayer.** Built for large catalogues and for translators
  working in external tooling; they bring providers, plugins and build steps this app
  has no use for yet. Worth revisiting if translation moves to a management system.
- **An in-app language picker.** Both platforms already offer per-app language
  selection; a picker would duplicate it, need persisted preference (the app has no
  state or storage decision yet — ARCHITECTURE.md §3.6), and need a design that does
  not exist.
- **English only, Finnish later.** Fails the requirement, and retrofitting copy is
  strictly more expensive than starting with lookups.
- **Finnish as the fallback language.** Defensible for a Finland-first app, but the
  source language is English and an unsupported device is better served by the language
  the app is authored in; the fallback is one constant to change.

## Consequences

- Screens read copy through `useTranslation()`; the screen tests keep asserting the
  frame's English words (that is the default state) and a separate suite renders both
  screens in Finnish.
- **Finnish strings are authored in this repository, not extracted from the design**,
  and they need a native review before release (PROJECT.md, open questions).
- Finnish runs longer than English: on screen 01 at 390 px, the third promise tag wraps
  to two lines, which the frame does not account for. Layouts must tolerate longer copy
  rather than assume the English line lengths.
- **App metadata is not localized yet.** The display name is the brand (“picky”) and no
  permission strings exist yet; the `app.json` `locales` block arrives with the first
  one (the location permission, screen 05).
- Adding Swedish is one catalogue file plus one entry in `SUPPORTED_LOCALES` and the
  `supportedLocales` lists in `app.json`; the typecheck and the catalogue tests then
  demand the complete translation.
- The design's “EN / FI” footer is treated as an indicator of the supported languages,
  not as a control.
