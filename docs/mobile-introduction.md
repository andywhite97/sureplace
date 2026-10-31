# Mobile first-launch introduction

Native mobile only. Suri introduces four areas: properties, stays, saving/messaging/viewings, and listing/managing a place.

- Shown when `sureplace.mobile-intro.v1` is absent from the app's local storage. Existing installations will also see it once after updating to a build containing this feature.
- Skip, Explore SurePlace and Back from the first screen mark it complete. Logout leaves the marker intact. Clearing app data or reinstalling can show it again.
- Back moves to the previous screen; Android hardware Back does the same.
- The underlying route stays mounted and inert while the introduction is visible. Completing the tour returns to that route, including an incoming link.
- Replay through Help Centre → “Take the SurePlace tour with Suri”.
- A storage failure still allows entry; persistence cannot be guaranteed in that case.
- Safe-area padding, scrolling on short screens, reduced-motion styling and labelled buttons are included.

Validation: seven focused tests cover native-only visibility, persistence, blocked storage, replay, Back, all four screens and skipping. Before distributing an APK, check on a phone: fresh launch, skip, relaunch, complete, replay, Android Back and incoming links.
