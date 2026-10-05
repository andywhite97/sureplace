# SurePlace mobile readiness review

Reviewed 5 October 2026. Recommendation: retain Angular and Django, add Capacitor, and adapt the existing interface incrementally.

## Review scope

Browsed the deployed public homepage, property search and filters, property detail, stay search and detail/date controls, sign-in, and property map view. Used 390 × 844 and 360 × 800 browser viewports. Read local navigation, authentication, API configuration, messaging, listing forms, and backend notification/CORS code. This was a read-only audit; no application code or external records were changed.

Authenticated account, agency, messaging, and management screens were assessed from source, not through a signed-in session. Browser sizing does not verify native keyboards, device permissions, OS process termination, or installed app behavior. The live site and local checkout differ: the live sign-in page exposes bottom navigation, while local `mobile-navigation.component.ts` explicitly hides navigation on authentication routes. Confirm the intended source revision before fixing deployed behavior.

## Existing foundation to keep

- Angular services separate API access and authentication from screen presentation.
- Django JWT API can serve both web and mobile clients.
- Mobile bottom navigation already exists, including unread badges and bottom safe-area padding.
- Homepage uses mobile search controls and swipeable cards.
- Search filters already use a modal sheet.
- Property and stay detail pages already have fixed contact/reservation actions.
- Messages already switch between list and thread layouts on small screens.
- Listing forms already support server drafts and unsaved-change detection on browser unload.

## Observed interface issues

| Priority | Evidence | Recommended change |
| --- | --- | --- |
| Before first mobile beta | Property search sort dropdown crowds/clips the Map label at 390px and 360px | Place sorting in a separate row or sheet; give List/Map sufficient space and test 320–430px widths |
| Before first mobile beta | Stay detail document width was 413px in a 390px viewport; Share stay extended to about x=398px | Constrain gallery and thumbnail containers, inspect grid/flex minimum widths, and keep overlaid controls within the viewport |
| Before first mobile beta | Sign-in shows a tall welcome panel before the form; submit requires scrolling | Use a compact app sign-in header with the form immediately available; verify keyboard visibility |
| Before first mobile beta | Fixed detail actions occupy the same bottom edge as global navigation; both are present in the accessible page | Make shell navigation explicitly route-aware; hide the global tab bar on detail/thread flows or reserve separate space |
| Mobile experience refinement | Explore always routes to properties, even while viewing stays | Make Explore a combined property/stay entry or retain the last selected search domain |
| Mobile experience refinement | Stay date selection opens inline controls further down the page | Consider a focused date/guest sheet with persistent Apply and Cancel actions |
| Mobile experience refinement | Full website footer remains on public and authentication pages | Use a native app shell with Help, legal links, and preferences under Account/settings |

Several images were blank or still loading during the session. That observation alone does not establish a broken URL. Check image delivery and loading/failure behavior on real devices and slow connections before release.

## Required integration work

1. **Native build and configuration.** No Capacitor dependencies/configuration or lifecycle integration were found in the inspected frontend. Add Android/iOS targets, an app build configuration, packaged web assets, icons, splash screen, signing setup, and repeatable release builds. Keep the website build separate where its prerendering/SEO configuration differs.
2. **Persistent secure sessions.** `src/app/core/auth/token-storage.service.ts` reads/writes tokens synchronously in sessionStorage/localStorage. Introduce a storage abstraction backed by secure device storage on native targets. Adapt startup and refresh flows to asynchronous storage and verify cold start, process restart, expiry, and logout cleanup.
3. **API origin configuration.** `src/environments/environment.production.ts` already uses an HTTPS Django endpoint. Configure the selected native WebView origins in the backend CORS allowlist, and test Authorization, uploads, and token refresh from an actual device. Keep CORS explicit. Assess CSRF only for endpoints using cookie/session authentication.
4. **Public sharing URLs and inbound links.** Property sharing uses `location.href`; stay and agent sharing use the runtime origin. In a packaged app those can produce a local app URL. Generate links from the configured public website origin, then add verified app links/universal links for listings, password reset, verification, and invitations. Preserve the destination through sign-in and handle both cold and warm starts.
5. **Android Back behavior.** Define dismissal order for keyboard, sheets, dialogs, and gallery before route navigation. Protect unsaved forms and restore search context when returning from a listing.
6. **Keyboard and safe areas.** `src/index.html` lacks `viewport-fit=cover`, while some existing styles use safe-area variables. Validate top/bottom system bars and edge-to-edge configuration together. Messaging uses viewport height calculations and needs real keyboard testing so the composer and recent messages stay visible.
7. **Lifecycle and connection handling.** Messaging polls the active thread every 15 seconds and the conversation list every 45 seconds using document visibility checks. Bridge foreground/background events, refresh on resume, and explicitly show offline/reconnecting states. Review the 14-minute browser backend keep-alive timer; reliable backend availability should not depend on mobile clients running timers.
8. **Push notification delivery.** No FCM/APNs/device-token integration was found in the inspected backend notification directory. Add device registration, delivery, preferences, token rotation/removal, logout cleanup, and notification-tap navigation for messages, bookings, viewings, and saved-search alerts. Foreground polling can remain initially; push covers closed/background app use.
9. **Device functions.** Current flows use browser file inputs, geolocation, sharing, and clipboard APIs. Test WebView support first, then introduce platform adapters where native camera/gallery, location permission, sharing, external browser, and map directions improve reliability. Handle permission denial and cancelled actions.
10. **Draft and upload recovery.** Listing forms have server drafts and browser `beforeunload` checks, which do not cover all OS termination paths. Persist recoverable edits, use route guards, restore after camera/app switches, and handle interrupted uploads. Prevent duplicate booking/viewing submissions during retries; audit existing backend protections before adding new ones.

## Suggested sequence

1. Fix confirmed small-screen overflow and navigation issues; simplify app sign-in.
2. Package an Android build, integrate secure sessions, CORS, Back handling, lifecycle, and public links.
3. Test search → detail → sign-in → saved listing/message/viewing on real phones.
4. Add push notifications and device integrations; test host listing creation and uploads.
5. Validate stay booking, resume/offline recovery, accessibility/text scaling, and iOS safe areas before store submission.

## Official implementation references

- [Capacitor App lifecycle, links, and Back events](https://capacitorjs.com/docs/apis/app)
- [Deep links](https://capacitorjs.com/docs/guides/deep-links)
- [Push notifications](https://capacitorjs.com/docs/apis/push-notifications)
