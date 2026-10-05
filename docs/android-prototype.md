# Android prototype

This is a debug build for testing the existing SurePlace login and mobile screens. It packages the Angular frontend locally and calls the existing HTTPS Django API at `https://sureplace-back-e1u4.onrender.com/api/v1`. It does not deploy changes to the website or backend.

## Install and test

1. Copy `dist/android/SurePlace-prototype-debug.apk` to your Android phone and open it to install. Android may ask you to allow installation from the app used to open the APK.
2. Open **SurePlace Prototype**, browse a property, and open **Sign in**.
3. Log in with your existing SurePlace account. Check that the keyboard leaves the form usable, the login button responds, and Account displays your profile.
4. Open Saved and Messages, then use Android Back to return.
5. Test logout and logging in again. To test persistence with the current web authentication implementation, select **Remember me**, close the app, and reopen it.

Supported minimum is Android 7 (API 24). An internet connection is required for API data. This prototype has a separate application ID, `com.twinpeaksinvestment.sureplace.prototype`.

## Build again

From the frontend directory:

```powershell
npm run android:apk
```

The build script builds the mobile SPA, syncs Capacitor, runs Gradle `assembleDebug`, and copies the APK to `dist/android/SurePlace-prototype-debug.apk`. It uses `JAVA_HOME` if set; on Windows it otherwise searches the user's `.jdks` folder for JDK 21 and detects the usual Android SDK location. Set `JAVA_HOME` to JDK 21 and `ANDROID_HOME` to your SDK if your setup differs.

Other commands:

```powershell
npm run build:mobile
npm run android:sync
npm run android:open
npm run preview:mobile
```

The browser preview runs on `http://localhost:4300` and proxies API requests to the live backend. The installed app instead uses Capacitor's native HTTPS transport for Angular XHR requests. The mobile build skips the website's server rendering and hydration.

## Included changes

- Separate sort row on phone property search; readable List/Map controls.
- Constrained stay gallery and thumbnails so share actions stay on screen.
- Compact phone sign-in with the welcome illustration panel hidden.
- Bottom tabs hidden on property/stay details, auth, conversations, and listing forms.
- Website footer omitted inside the installed native app.
- Public website links used for property/stay sharing.
- Native keyboard resizing and Back handling for keyboard, supported overlays, history, and app minimization.
- App backups disabled for this prototype.

## Remaining release work

The prototype retains the current web token storage implementation. Secure native token storage, push delivery, verified inbound app links, interrupted draft/upload recovery, and store signing/branding still need implementation before a public release. Back protection for dirty listing forms also remains to be implemented; this prototype is intended first for seeker/login testing.

## Validation

The optimized mobile SPA compiled successfully. Browser checks at 390px and 360px confirmed readable search controls, visible stay sharing, no stay-page horizontal overflow, hidden detail/auth bottom tabs, and the login submit button in the initial viewport. On 5 October 2026, the user confirmed native login and persistence after reopening. Actual phone keyboard behavior remains to be checked.

Gradle `assembleDebug` succeeded, and Android `apksigner verify --verbose` verified the APK's v2 signature. The packaged application ID, label, minimum API 24, and target API 36 were checked with `aapt dump badging`.

The full frontend suite initially passed 362 of 363 tests. The remaining existing homepage stay-search test had fixed check-in dates that were now in the past; its clock dependency was made deterministic. All 45 tests in the affected homepage, login, and mobile-navigation suites then passed.

The production website build also succeeded, including static prerendering. Existing bundle/style warning thresholds still report warnings; all error budgets pass.

## Viewing confirmation cleanup fix

The user reported an unstyled viewing confirmation beneath Messages after following the confirmation's navigation link. The viewing/report overlay was moved to the document body and survived its originating component; Angular then removed its scoped styles. Overlay teardown now explicitly removes that node and its empty root, restores scrolling, and closes on navigation. Confirmation links close it immediately, and pending requests are cancelled when the component is destroyed. Regression tests cover destruction, navigation to Messages, and reopening a fresh overlay.

All 11 property-contact tests passed. The refreshed Android APK built successfully and its signature was verified. Install it over the existing prototype, then retest Request Viewing → Open messages.

## Mobile page transitions

The mobile build uses Angular's View Transitions integration. Opening detail or account screens uses a 220ms directional slide and fade; Back reverses the direction. Switching between bottom-tab destinations uses a 140–180ms fade. Header and bottom navigation are outside the animated page surface. Initial load and same-page query/fragment changes do not animate. Reduced-motion preferences skip transitions, and WebViews without the API retain normal navigation.

The desktop website does not enable route transitions. Small-screen browser previews use the same motion as the mobile app. Motion uses captured page views instead of transforming live DOM containers, preserving fixed composer, contact, and overlay positioning.

All 20 tests across page motion, app shell, and viewing-dialog suites passed, including direction, tab changes, reduced motion, query changes, and overlapping-transition cleanup. On the phone, check Home → Explore → property → Back, tab switching, Account → Saved/Messages, and rapid successive navigation.

Implementation reference: [Angular route transition animations](https://angular.dev/guide/routing/route-transition-animations).

The animated APK built successfully and its signature verified. The local in-app browser lacks `startViewTransition`; its fallback was checked by opening a property with no console errors and verifying the fixed contact controls. Actual animation timing and smoothness remain for the Android device test.
