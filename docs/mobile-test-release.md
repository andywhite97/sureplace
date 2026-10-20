# SurePlace Android test release 0.2.0

Distribution target: test APKs, as requested. This is a debug-signed test build; it is not a store release. The existing application ID is preserved so testers can install it over SurePlace Prototype without deliberately clearing app data. The launcher label is now **SurePlace Test**.

## Package

- Version name: `0.2.0-test`; Android version code: `2`.
- Output: `dist/android/SurePlace-0.2.0-test.apk`.
- Checksum: the adjacent `.apk.sha256` file.
- Build details: `dist/android/build-info.json`.
- Compatibility alias: `dist/android/SurePlace-prototype-debug.apk`.
- Backend: the existing HTTPS SurePlace API. Test submissions still use that backend.

Install the new APK over the existing app. Use **Update**, without uninstalling, to exercise session migration. If Android reports a signing conflict, stop and report it rather than removing the old app and losing its migration test data.

## Changes

- Remembered native access/refresh tokens use device secure storage. Startup waits for secure restoration before checking the authenticated user. Existing remembered prototype credentials migrate on first startup; plaintext browser copies are removed after migration. Non-remembered native sessions remain in memory.
- Token writes and deletion are ordered. A non-secret logout marker prevents a stale encrypted session from being restored if device storage cannot be cleared immediately. Authentication does not complete if secure persistence fails.
- Native network and foreground/background events drive an offline status notice and suppress background/disconnected polling. Returning online or resuming refreshes account activity and retries a previously interrupted session restoration.
- Unsaved property/stay changes, saves in progress, queued property photos, and busy room editing are protected when navigating away, including Android Back. This is a leave-page warning, not automatic recovery after Android terminates the process.
- Property, stay, and agent sharing uses the native share sheet and public website URLs. External web links use the device's browser surface, rather than replacing the packaged app.
- Native incoming links are validated against supported SurePlace routes. The test scheme is `sureplace://`, e.g. `sureplace://properties/guesthouse` or `sureplace://account/messages`. Cold and running-app link handlers are configured. Arbitrary origins, credential-bearing URLs, staff routes, and encoded path separators are rejected.
- SurePlace launcher and splash use the existing approved favicon asset. Native diagnostic logging is disabled. Previously implemented page animations and viewing-overlay cleanup remain included.

## Device acceptance checklist

| Test | Expected result | Status |
| --- | --- | --- |
| Install over the old prototype | Update installs; launcher becomes SurePlace Test | Pending device |
| Open a previously remembered account | Account restores or requests normal login if server credentials expired; no account switch | Pending device |
| Login with Remember me, terminate and reopen | Same account restores | Pending device |
| Login without Remember me, terminate and reopen | Session is not restored after process termination | Pending device |
| Logout, terminate, reopen | Remains logged out | Pending device |
| Switch accounts | Saved listings/messages belong only to the new account | Pending device |
| Turn off connectivity, then restore it | Offline notice appears and clears; account activity refreshes | Pending device |
| Open with no connection | No account access is granted without backend validation; reconnect and check restoration | Pending device |
| Background/resume Messages | New messages and unread counts catch up; composer remains usable | Pending device |
| Edit a property or stay and press Back | Leave warning offers the chance to stay and save | Pending device |
| Save/submit listing successfully | Intended navigation succeeds without a spurious leave warning | Pending device |
| Select/upload photos from device | Existing picker, previews, upload and cancellation work | Pending device |
| Share property, stay, agent | Native share sheet includes a public HTTPS website URL | Pending device |
| Open directions or another external link | External browser opens; returning preserves the app | Pending device |
| Request viewing → Open messages | Confirmation disappears and conversation remains styled | Pending device |
| Stay dates/guests/room → booking request | Correct availability and totals; request appears in Bookings | Pending device |
| Save/unsave listings, review alerts and notifications | Changes persist for the current account and route to the correct screen | Pending device |
| Search → details → Back, and switch tabs | Animations remain smooth; controls stay positioned correctly | Pending device |
| Open test-scheme link, signed out and signed in | Appropriate route/auth guard opens in the app | Pending device |

## Boundaries for this test release

Background push delivery and verified HTTPS App Links are not configured. Website/email HTTPS links can still open in a browser; the custom test scheme does not claim verified domain association. Android photo picker/camera, location permission behavior, keyboard layout, rotation, and real secure-store migration still require the device checks above. No local changes have been deployed to the website or backend.

## Build

Run `npm run android:apk` from the frontend directory with JDK 21 and the Android SDK installed. The script builds the mobile SPA, syncs plugins, assembles and verifies the debug APK, and emits the versioned package, checksum, and build metadata.

## Validation record

Completed 20 October 2026:

- Full frontend suite: **500 tests passed across 96 files**, without unhandled teardown errors.
- Production website build: passed, including prerendering of 13 static routes. Existing size warning thresholds still report warnings; error budgets pass.
- Mobile SPA and Gradle debug APK: passed; all six native plugins included.
- APK signature: verified using Android APK Signature Scheme v2; signer is the Android debug certificate. Certificate SHA-256: `323ab2e91b11fdf2501e913e9fa45de2faf8de95fe241e1654dc064cfcf3084a`.
- Packaged metadata: `SurePlace Test`, application ID unchanged, version code 2, minimum API 24, target API 36.
- Packaged permissions: Internet, network state, and the application's non-exported receiver permission. No new camera/location/storage permissions requested by this change.
- APK checksum matches `build-info.json` and the adjacent SHA-256 file. APK size: 18,752,592 bytes.
- QA logs: `dist/qa/mobile-tests.log`, `dist/qa/web-build.log`, and `dist/qa/android-build.log`.

Device checks remain pending until performed on a phone. Previously reported login, persistence, and logout success apply to the original prototype; secure-store migration in this release needs a fresh device check.
