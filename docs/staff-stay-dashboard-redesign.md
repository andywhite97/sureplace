# Staff stay listings redesign

Implemented in the existing Angular application and Django moderation APIs. The desktop queue and review panel share one review component; tablet and mobile use a full-page review. Existing staff routes, permission checks, moderation rules, and booking behavior are preserved.

## Features

- SurePlace branding, staff workspace navigation, global status counters, photo listing cards, and responsive queue/detail layouts.
- Search, status, town, host, ordering, and pagination backed by real APIs and preserved in URL query parameters. Selection and tabs do not reload the queue. Deep links and browser navigation work.
- Loading, empty, error, missing-image, and invalid-page recovery states. Successful decisions refresh the queue and global counters.
- Cover-first photo galleries, thumbnails, previous/next controls, and native full-screen dialogs.
- Accessible Overview, Rooms, Policies, and Verification tabs with keyboard navigation. Actual host, email verification, coordinates/map, room inventory/prices, policies, listing history, reports, and verification evidence are shown.
- Host email verification, stay verification, and listing approval remain separate concepts. Protected evidence links and accurate request/document counts respect verification permissions.
- Existing moderation actions use confirmations, required reasons where supported, busy guards, backend validation feedback, and audit-producing endpoints. The backend remains authoritative.
- Permission-filtered mobile staff navigation, notifications, exit console, logout, and trust-and-safety notice. Scoped minimum-width handling prevents staff workspace overflow without changing public layouts.

Counters are global rather than derived from the current page: pending means submitted, under review is separate, approved means published, and total includes all statuses.

## Files

Frontend paths below are relative to `sureplace/`.

Created:

- `src/app/core/models/staff-stay.models.ts`
- `src/app/core/api/staff-stay-api.service.ts`
- `src/app/features/staff/staff-stays.component.html`
- `src/app/features/staff/staff-stays.component.scss`
- `src/app/features/staff/staff-stays.component.spec.ts`
- `src/app/features/staff/staff-stay-review.component.ts`
- `src/app/features/staff/staff-stay-review.component.html`
- `src/app/features/staff/staff-stay-review.component.scss`
- `src/app/features/staff/staff-stay-review.component.spec.ts`
- `src/app/features/staff/staff-stay-gallery.component.ts`
- `src/app/features/staff/staff-dialog.test-support.ts`
- `docs/staff-stay-dashboard-redesign.md`

Modified:

- `src/app/features/staff/staff-stays.component.ts`
- `src/app/features/staff/staff-shell.component.ts`
- `src/app/layout/public-header.component.ts`
- `src/app/app.routes.ts`
- `src/styles.scss`
- Backend `sureplace_back/moderation/stays.py`
- Backend `sureplace_back/moderation/tests_stays.py`

## Components and backend integration

Introduced a dashboard controller, shared stay review, gallery, typed staff stay models, and API service. Reused SmartImageComponent, ListingMapComponent, existing money formatting, ApiClient, AuthService, ToastService, navigation drawer, and staff verification viewer.

Backend changes are limited to read API capabilities: town and host filters, validated ordering, global summary counts/filter choices, and permission-protected verification request/document counts. Evidence counts exclude draft requests and do not expose storage URLs. No new migration, framework, authentication scheme, booking rule, or moderation transition was introduced by this redesign.

## Validation

- Full Angular suite: **448 tests passed across 86 files**.
- Backend moderation, stays, and accounts suites: **62 tests passed**.
- New summary/filter test also passed against native PostGIS in an isolated test database.
- Angular application type checking passed; formatting checks and backend Ruff checks passed.
- Production Angular/GitHub Pages build passed, preparing 11 indexable sitemap URLs and the SPA fallback. The final build required access outside the filesystem sandbox to resolve installed Angular dependencies.
- Browser checks covered queue and selected review at 320, 375, 390, 430, 768, 1024, 1280, and 1440 pixels: all 16 checks had no horizontal overflow.
- Live browser checks verified URL filtering, responsive review navigation, galleries/lightbox, tabs, native decision confirmations, and the staff-only mobile menu. Real moderation decisions were exercised in test databases; live browser confirmations were cancelled, leaving actual stay statuses unchanged.

No standalone ESLint or browser end-to-end test runner is configured in this repository. Native dialog behavior was checked in the browser in addition to unit tests with dialog support for the test DOM.

## Screenshots and QA artifacts

Artifacts are local and ignored by Git, under `C:/Users/djand/Projects/SurePlace/sureplace_back/.booking-qa/`:

- `screenshots/stay-dashboard-desktop.jpg`
- `screenshots/stay-dashboard-mobile.jpg`
- `screenshots/stay-review-mobile.jpg`
- `staff-stay-responsive-checks.json`
- `staff-stay-redesign-tests.log`
- `staff-stay-redesign-backend-tests.log`
- `staff-stay-redesign-postgis-tests.log`
- `staff-stay-redesign-build.log`

## Outstanding issues

Soft bundle/style budget warnings remain, including the new queue styles (7.56 kB) and review styles (5.18 kB), above the 4 kB warning threshold but below the error threshold. Budgets were not relaxed. Public API listing discovery timed out during prerendering, which uses the existing client-rendered fallback. An unavailable demo cover image correctly displays the missing-image fallback. These do not prevent staff moderation from working.

This report covers the stay moderation redesign, not certification that every part of the application is production-ready. Nothing has been deployed.
