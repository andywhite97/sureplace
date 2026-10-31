# Mobile UX and authentication refinement

Implemented locally on 21 October 2026. No backend APIs, payload contracts, permissions, intent values, JWT handling or token-storage methods were changed. The existing 0.3.0 APK has not been rebuilt with this redesign.

## Changes

- Shared `--ux-*` tokens extend the existing theme with consistent surfaces, controls, borders, spacing, accessible dark teal actions and restrained motion.
- `SuriGuideComponent` renders welcome, search, favourite, support and home poses from the official brand sheet. Explicit crop bounds exclude printed captions. Inline, support, illustration and tip variants keep the text accessible independently of the decorative artwork.
- The four-screen introduction uses the supplied copy, different poses, compact spacing, swipe navigation, keyboard arrows, Back/Next/Skip and the existing final Explore action. Completion storage and the destination beneath the introduction are preserved. Replay uses the existing native Help Centre flow and returns focus to its invoking control.
- Login has a balanced desktop layout and compact mobile form. It retains password visibility, Remember me, inline errors, pending states, verification assistance, API feedback and safe return routing. Authentication pages omit the marketing footer and bottom navigation.
- Registration retains all four stages and the four supported backend intents, including multiple selections. It has a compact stepper, distinct stage headings, keyboard submission, disabled progression for incomplete stages, live password-match feedback, retained fields, error handling and edit/review actions. Policy links use existing routes; no new account type or consent payload was introduced.
- Recovery has a compact support greeting, full-width Send reset link action and a neutral Check your inbox state. Reset confirmation adds accessible visibility toggles and duplicate-submission prevention while preserving existing tokens and endpoint payloads.
- Help has a shorter photographic hero, a readable search field, dynamic counts outside the input, working popular searches, a distinct tour invitation, existing categories/articles and existing support destinations. Help-specific class names prevent unrelated global hero styles from imposing large heights.
- Guest headers display Sign in rather than a notification bell. Focused auth headers expose Help. Existing authenticated notifications, account navigation and permission filtering are retained. Narrow header grids and text wrapping accommodate mobile widths and enlarged text.

## Main files

- Theme and shell: `src/styles.scss`, `src/app/app.ts`, `src/app/layout/public-header.component.ts`.
- Mascot: `src/app/shared/ui/suri-guide.component.ts`.
- Tour: `src/app/features/onboarding/mobile-intro.component.ts`, its SCSS/spec and `src/app/core/services/mobile-intro.service.ts`.
- Authentication: `src/app/features/auth/{login,register,forgot-password,reset-password}.component.ts`, shared `auth-pages.scss`, and the login/registration SCSS files.
- Support: `src/app/features/help/help-centre.component.ts` and SCSS/spec.
- New regression coverage: `src/app/features/auth/recovery.spec.ts`, Help Centre tests, and expanded registration/tour tests. Existing login/header assertions were updated for the intended presentation changes.
- Local browser fixture: `scripts/qa-mobile-ux.cjs` exports a `start(chromium)` helper using the installed Edge browser and a provided Playwright runtime. It serves the compiled mobile bundle on localhost, overrides only tour eligibility, and intercepts API calls with synthetic responses. It adds no application dependency.

## Verification performed

- `npm test -- --watch=false`: **532 passed, 101 files**.
- `npm run build:mobile`: passed.
- `npm run build:prod`: passed, including **13 prerendered static routes**. Non-blocking bundle/style budget warnings remain, including registration and Help Centre component styles.
- Prettier checks on the changed components, styles, shared service and QA helper passed. There is no separate configured lint command in package.json.
- Browser matrix: five routes (login, registration, recovery request, reset confirmation and Help) at **320, 360, 375, 390, 430, 768, 1024 and 1440px**; **40 checks** with no horizontal page overflow.
- Tour matrix: four steps at those eight widths; **32 checks**, including a short 320×568 viewport.
- Text zoom: the five pages and four tour steps at **200% text size** on both 320px and 390px widths; **18 checks** with no horizontal page overflow. Registration Details, Intent and Review stages were additionally exercised at 320px/200%.
- Browser interactions: multi-intent registration and verification routing, neutral recovery success, password reset confirmation, password visibility, incorrect login feedback, keyboard login, safe return URL, Help search/popular search/empty state, tour replay, completion persistence, keyboard arrows and touch swipe. The captured browser session reported no unhandled page errors.
- API responses in browser interaction checks were mocked. No real account was created, password changed, reset email sent or live listing modified. Existing unit tests cover the retained authentication and routing behavior.

## Review artifacts

- Gallery: `dist/qa/mobile-redesign/index.html`.
- Screenshot archive: `dist/qa/SurePlace-mobile-UX-redesign.zip`.
- Browser results: `dist/qa/mobile-redesign/browser-results.json`.
- Logs: `dist/qa/mobile-redesign-tests.log`, `mobile-redesign-build.log` and `mobile-redesign-production.log`.

Screenshots are real browser renders of the packaged SPA at a 390×844 viewport. They are not Android-device screenshots. A preview-only eligibility override exposes the native tour without invoking Android plugins.

## Remaining release checks

Rebuild an APK after reviewing the UI, then test Android keyboard resizing, OS password-manager autofill, safe areas and device-specific WebView/touch behavior on a phone. Existing authentication persistence should also be confirmed on the updated device build. The browser viewport and text-zoom checks do not substitute for those device checks or a formal accessibility audit.

The optional Create an account CTA was not added to the tour: Explore remains its final action, and existing registration routes remain available after entry. Native Help Centre replay remains native-only, matching the existing behavior.
