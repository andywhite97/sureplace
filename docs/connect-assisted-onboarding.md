# SurePlace Connect and assisted onboarding — local implementation

Implemented 20 October 2026. Source changes only: no production migrations, deployment, external messages, real prospect creation or publication. The previously supplied Android APK does not contain these new features. Deploying the API and migrations is a prerequisite for testing them against the live backend.

## What changed

- Shared public-business URL validation and optional Facebook, Instagram and TikTok fields on Stay, PropertyListing and Agency. Existing Stay/Agency website and WhatsApp fields are reused; PropertyListing gains them. New columns have persistent blank database defaults for compatibility with older writers.
- Social & Online Presence controls in the three existing management editors. Secondary, safely attributed links on public stay, property, agency and agent-associated agency views. Existing owner/agency permissions remain authoritative.
- Isolated private prospect, preview, image and audit models; no staging content enters listing queries or consumes publication capacity.
- Staff board, intake/content editor, room outlines, image permission records, preparation, seven-day link issuance/rotation/revocation, manual delivery recording, requested changes, signed/independently verified approval, and owner-bound invitations.
- Authenticated owner acceptance through the existing account system creates a normal DRAFT using the existing listing/room/image serializers. Room inventory is inactive initially. The normal editor, submission, verification and moderation process remains required.
- Owner acceptance optionally copies approved photos to ordinary listing media, with explicit consent to direct image-link visibility. Otherwise images stay private in staging. A retry or concurrent acceptance returns the same resulting draft.

## UI routes

- `/staff/onboarding`: narrowly permissioned staff workspace.
- `/private-preview#<token>`: private read-only renderer. Fragment is removed from browser history after it is read; reloading then requires reopening the original link. No marketplace navigation or booking/enquiry/favourite controls.
- `/account/onboarding-claim/<prospect-id>`: sign-in required, bound to the verified contact account.
- Existing `/account/manage/stays/:id/edit`, `/account/manage/properties/:id/edit`, `/account/manage/agency/profile`: social editor.

## Staff SOP

1. Grant `core.view_onboardingprospect` plus only the required permissions: `add_onboardingprospect`, `change_onboardingprospect`, `delete_onboardingprospect`, `issue_onboarding`, `approve_onboarding`, `handoff_onboarding`. These appear in the existing staff permission catalogue. Being staff alone is insufficient.
2. Create a Stay or Property prospect. Record private contact information, responsible staff, next action and independently evidenced consent. Workflow status does not imply consent.
3. Record the source and permission for business text. Enter provisional content and optional room types/rates. Unknown values stay blank. Add rights-cleared images with separate source and permission evidence for each upload. Images are decoded and re-encoded as bounded JPEGs, stripping original metadata.
4. Save, then prepare the preview. Generate and copy the seven-day link. It is displayed only immediately after issuance. Generating a replacement revokes the previous link. Send it manually to the intended recipient, then record delivery with evidence; generating a link does not send a message.
5. Collect corrections out of band and record them using Request changes. Saving any revision increments the version, revokes links and clears approval/invitation binding. Re-prepare and obtain approval again.
6. Record explicit owner approval, identity-check method and signed evidence/reference. Check listing and photo rights. Link possession and page views are never ownership evidence. This implementation intentionally uses staff-recorded verified approval rather than token-based self-approval or email OTP.
7. Ask the operator to register/sign in and verify the contact email using existing authentication. Independently confirm ownership/right to manage, then bind the invitation. For an agency handoff, the invited user must currently be an active OWNER or ADMIN of that agency; agency membership is checked again at acceptance.
8. Copy the owner acceptance link and send manually. The owner reviews content, confirms rights and chooses whether to use approved photos. Acceptance automatically records HANDED_OFF; staff cannot manually claim a successful handoff.
9. Owner completes missing prices/location/photos and other normal listing requirements, activates room inventory where appropriate and submits for existing review. No payment, verification or publication is fabricated.
10. Close unused leads with a reason. This revokes previews and invitations. A staff member with deletion permission can DELETE a closed, unused prospect with its current version (request body or `?version=N`). This also removes its private images/audit data; handed-off records cannot use this deletion path. Follow the existing privacy/retention policy and review database backup retention separately.

### Pilot examples

For a separately approved staging/dev pilot, manually create **The Grove**, **Asante Guesthouse**, **Open House Boutique** and **The Ridge** as NEW prospects, with consent UNKNOWN and no rates/photos/verification. Names are prospective examples, not confirmed relationships. No migration or seed command creates these businesses. Request source details and permission before preparing each separate preview.

### Manual permission request

Hello [name], SurePlace can prepare a private demonstration of your business profile. May we use the description and photos you provide for this purpose? Please confirm that you have permission to share them. Nothing will be published or bookable until you approve the content, claim your draft and complete the normal review process. Please reply with corrections or permission preferences.

### Manual preview invitation

Hello [name], your private SurePlace preview is ready: [private link]. This link expires in seven days. It is a demonstration, not a live listing; rates and availability are not confirmed. Please review the content and reply with corrections. We will separately confirm identity, listing rights and your explicit approval before inviting you to claim a draft.

## API

All paths below are under `/api/v1/` and use existing DRF error envelopes/request IDs.

- `GET/POST staff/onboarding/`; filters `kind`, `town`, `status`, `search`, plus normal pagination.
- `GET/PATCH/DELETE staff/onboarding/<id>/`. PATCH/DELETE require the current `version`.
- `POST staff/onboarding/<id>/{prepare,issue,revoke,transition,approve,invite,image}/`. Every action checks the current version. Image uploads use multipart; image removal uses the `remove` image ID.
- `POST onboarding/preview/` with `{token}`: read-only content lookup, no write action. Invalid, expired, revoked or out-of-date tokens return neutral 404; throttled requests return 429.
- `GET/POST onboarding/claims/<id>/`: authenticated invited owner only. Acceptance requires current version and `accept_rights: true`; copying photos additionally requires `use_approved_photos: true`.

## Security and storage

- Random 256-bit preview tokens are stored only as SHA-256 hashes. Tokens are sent in request bodies, never API paths/query strings, and existing request logging logs paths rather than bodies. Do not enable body capture on these endpoints in proxies/APM/error telemetry.
- Preview responses and staff/claim endpoints use `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow,noarchive`, and `Referrer-Policy: no-referrer`. Preview renderer adds robots/referrer meta directives. No sitemap generation references staging models.
- Before publishing the frontend, configure its host to send the same no-store/noindex/no-referrer headers for `/private-preview`; the current static frontend cannot set HTTP response headers itself. The private API payload is already protected independently.
- Preview images are bounded database bytes, not public Cloudinary URLs: maximum 12 per prospect, 5 MB upload and 20 million source pixels; normalized to at most 1600×1600. Production needs the existing shared Redis cache for the per-IP 30/minute preview throttle. Database/backups now hold private prospect contacts and photos.
- Read-only URLs are bearer capabilities intended for individual recipients; recipients can save content they can view. Revocation blocks subsequent access, not previously saved copies.
- Handoff is transactionally row-locked and checks content hash/version, explicit owner consent, verified invited email and current agency authority. It cannot set publication/verification flags from the payload. Image storage is external to the DB transaction; completed image uploads are cleaned up on an image-copy failure, but storage outages may still need orphan cleanup. Staging bytes remain available for audit.
- No new runtime packages were added. No social OAuth, posting, analytics, OTP service or email delivery was introduced.

## Migrations and rollout

Backend migrations:

1. `agencies/0005_agency_facebook_url_agency_instagram_url_and_more`
2. `properties/0009_propertylisting_facebook_url_and_more`
3. `stays/0010_stay_facebook_url_stay_instagram_url_stay_tiktok_url_and_more`
4. `core/0002_onboardingprospect_onboardingpreview_onboardingimage_and_more` (depends on the above).

After explicit deployment approval: back up the DB; test migrations on staging; apply the additive migrations; deploy backend; grant staff permissions; configure private-page response headers; deploy frontend; run a synthetic end-to-end staff/owner pilot; then rebuild the test APK. Do not use real operator content without permission.

Rollback: first remove access to the new UI and stop issuing previews, revoke active links, then roll application code back while retaining additive schema/data. Do not reverse migrations containing prospect data without a retention/backup decision. Handoff drafts remain ordinary listings and must not be silently deleted or reassigned.

## Verification

- Angular: 514 tests passed across 98 files (500 existing + 14 new). Final focused tests and build results are recorded in `dist/qa/connect-onboarding-final-tests.log` and `dist/qa/connect-onboarding-build.log`.
- Production Angular build passed; existing bundle/style budget warnings remain. Prerender discovery can time out against the existing remote API and use its established client-rendering fallback.
- Django system check passed; `makemigrations --check --dry-run` reports no changes.
- PostgreSQL: all 64 existing stay/property entitlement and booking concurrency tests passed (`scripts/test-stay-postgres.py`).
- PostgreSQL: all 19 onboarding/social/photo tests passed, including a simultaneous claim race creating exactly one draft (`scripts/test-onboarding-postgres.py`).
- Final full Django run: **335 tests; 320 passed, 10 skipped, 1 failed and 4 errored**. The five failures are pre-existing (one email-delivery expectation, two performance fixtures exceeding free listing quotas, two demo-seed tests exceeding stay quotas). All five were reproduced on an archived unchanged HEAD in a separate local directory. New migration compatibility failures were fixed with DB-level blank defaults; an agency fixture now uses a valid public-domain-shaped example URL under the new validation rules.
- Browser screenshots, 390px device interaction, live Cloudinary image-copy failure handling and rebuilt APK testing have not been performed for this feature. Responsive styles and component tests are present; complete these checks in staging before release.

## Changed-file map

Backend: `core/social.py`, `core/onboarding_models.py`, `core/onboarding.py`, `core/models.py`, `core/tests_onboarding*.py`, `scripts/test-onboarding-postgres.py`; existing models/serializers in stays/properties/agencies; API routing and staff permission catalogue; four additive migrations; agency test fixture.

Frontend: shared business-links validators/editor/display and tests; three management forms; listing/profile public views and interfaces; `core/api/onboarding-api.service.ts`; staff board/preview/claim components and tests; route guards/navigation integration and private preview shell.
