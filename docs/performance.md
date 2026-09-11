# SurePlace Performance Hardening

This note records the focused performance pass against the HAR bottlenecks observed on the deployed Angular SPA and Django API.

## Baseline Signals

Production checks from the deployed Render backend showed a clear split between hosting cold start and warm endpoint cost:

| Endpoint | Run 1 TTFB | Run 2 TTFB | Notes |
| --- | ---: | ---: | --- |
| `/api/v1/config/` | 45.360 s | 0.672 s | First hit is Render cold start dominated. |
| `/api/v1/reference/` | 3.657 s | 1.922 s | Warm response still benefits from app/cache headers. |
| `/api/v1/properties/featured/` | 3.078 s | 2.906 s | Warm response was slower than a small homepage card API should be. |
| `/api/v1/stays/featured/` | 6.469 s | 7.125 s | Warm response was dominated by query/serialization work. |

Render free or sleep-enabled services can still produce a very slow first request. The code changes below reduce application work after the service is awake, but an always-on instance, scheduled warm ping, or higher Render plan is the infrastructure fix for cold-start TTFB.

## Backend Changes

Public, low-risk bootstrap endpoints now use short server-side caching and explicit browser/cache headers:

| Endpoint | Cache setting | Default TTL |
| --- | --- | ---: |
| `/api/v1/config/` | `PUBLIC_CONFIG_CACHE_SECONDS` | 900 s |
| `/api/v1/reference/` | `PUBLIC_REFERENCE_CACHE_SECONDS` | 3600 s |
| `/api/v1/properties/featured/` | `FEATURED_LISTINGS_CACHE_SECONDS` | 60 s |
| `/api/v1/stays/featured/` | `FEATURED_LISTINGS_CACHE_SECONDS` | 60 s |

Featured property and stay endpoints now return the small card payload needed by the homepage instead of full listing/detail data. Anonymous responses are publicly cacheable; authenticated responses stay private and uncached.

Query work was reduced by using action-specific querysets:

| Endpoint | Before local queries | After uncached queries | After cached queries |
| --- | ---: | ---: | ---: |
| `/api/v1/config/` | 0 | 0 | 0 |
| `/api/v1/reference/` | 2 | 2 | 0 |
| `/api/v1/properties/featured/` | 7 | 2 | 0 |
| `/api/v1/stays/featured/` | 27 | 2 | 0 |

Local timing moved from 112.91 ms to 22.04 ms uncached on featured stays, and cached featured responses return in roughly 3 to 5 ms locally.

Instrumentation was also added:

- `Server-Timing: app;dur=...` on responses for request-level app timing.
- Startup log lines for WSGI/ASGI readiness.
- Database connection startup logging through Django's connection-created signal.

## Frontend Changes

Angular bootstrap no longer blocks first render on config, reference, and auth restore. Those services still load at startup, but the initializer subscribes asynchronously so the SPA can paint with safe fallback signals.

Config and reference API services now use in-memory single-flight loading with `shareReplay`, preventing duplicate concurrent requests and avoiding repeat fetches during a SPA session unless `refresh()` is called.

Homepage image assets were compressed and references were moved to the new JPG files:

| Asset | Before | After |
| --- | ---: | ---: |
| `logo_dark.png` | 583,236 B | 40,676 B |
| `logo_light.png` | 513,914 B | 34,541 B |
| `hero-eswatini-home` | 2,356,046 B PNG | 199,003 B JPG |
| `destinations-eswatini` | 3,016,022 B PNG | 202,776 B JPG |
| `property-types-sureplace.jpg` | 521,165 B | 193,287 B |
| `favicon.png` | 140,344 B | 13,411 B |

`SmartImageComponent` now applies Cloudinary delivery transforms for Cloudinary image URLs and shows a deterministic fallback when a listing image fails, preventing broken-image UI from stale media records.

## Broken Cloudinary Demo Media

The broken demo stay image IDs from the HAR were not found in the current source or seeder. Current demo data writes managed image files through Django storage instead of hard-coded stale Cloudinary URLs.

The frontend fallback now protects the UI, but production data should still be cleaned by reseeding or replacing stale Cloudinary media records after deployment.

## Bundle Check

Production build output after the pass:

| Bundle | Raw size | Estimated transfer |
| --- | ---: | ---: |
| Initial total | 475.38 kB | 118.58 kB |
| Main | 42.89 kB | 9.87 kB |
| Styles | 139.61 kB | 25.83 kB |
| Homepage lazy chunk | 24.17 kB | 6.64 kB |

Known warning: `public-header.component.ts` component CSS is 5.08 kB against the current 4.00 kB component style budget.

## Verification

Commands run locally:

```powershell
npm.cmd test -- --watch=false
npm.cmd run build:prod
npm.cmd run build:ghpages
$env:DEBUG='true'; $env:USE_SQLITE='true'; $env:USE_CLOUDINARY='false'; $env:ALLOWED_HOSTS='testserver,localhost,127.0.0.1'; & ..\.venv\Scripts\python.exe manage.py test core.tests_performance properties.tests stays.tests core.tests core.tests_seo
$env:DEBUG='true'; $env:USE_SQLITE='true'; $env:USE_CLOUDINARY='false'; $env:ALLOWED_HOSTS='testserver,localhost,127.0.0.1'; & ..\.venv\Scripts\python.exe manage.py test
```

Results:

- Angular tests: 35 files passed, 137 tests passed.
- Angular production build: passed with the known `public-header.component.ts` style budget warning.
- Angular GitHub Pages build: passed with SPA fallback prepared.
- Focused backend tests: 45 passed.
- Full backend tests: 113 passed, 2 skipped.

Formatter/linter note: backend `black` and `ruff` are not installed in the current virtual environment, so those checks could not run without adding dependencies.

## Deployment Follow-Up

After deploying the frontend and backend changes, capture a fresh HAR on `https://sureplace.twinpeaksinvestment.com/` and compare:

- First navigation versus second navigation after the backend is awake.
- TTFB for `/api/v1/config/`, `/api/v1/reference/`, `/api/v1/properties/featured/`, and `/api/v1/stays/featured/`.
- Duplicate config/reference requests during homepage load.
- Any remaining 404 image requests.
- Cache headers and `Server-Timing` on API responses.
