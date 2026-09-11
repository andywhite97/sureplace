# Angular Prerendering

SurePlace uses Angular build-time prerendering with hydration for production frontend builds. The deployed GitHub Pages site is still static: no Node server, Express server, or runtime SSR process is required.

## Files

- `src/main.server.ts`: server bootstrap used by Angular during the production build.
- `src/app/app.config.server.ts`: merges the browser app config with Angular server rendering providers.
- `src/app/app.routes.server.ts`: declares which routes prerender and which routes remain client-rendered.
- `src/app/app.config.ts`: enables client hydration and skips bootstrap API calls during server rendering.

## Route Policy

Prerender public, stable routes:

- `/`
- `/properties`
- `/stays`
- `/agents`
- `/verification`
- `/login`
- `/register`

Keep authenticated and account routes client-rendered:

- `/account`
- `/account/**`
- `/messages`
- `/bookings`

Use client fallback for detail pages when build-time slug discovery is unavailable:

- `/properties/:slug`
- `/stays/:slug`

## Dynamic Slug Discovery

The build reads public slugs from:

- `${apiBaseUrl}/properties/`
- `${apiBaseUrl}/stays/`

By default `apiBaseUrl` comes from `src/environments/environment.production.ts`. Override it for CI or local testing with:

```bash
SUREPLACE_PRERENDER_API_BASE=https://example.com/api/v1 npm run build:ghpages
```

If the API returns an error, times out, or is unavailable, the build logs a warning and returns no dynamic params. GitHub Pages still serves those detail URLs through `404.html`, and Angular loads the listing in the browser.

## Browser-Only Code

Code that touches browser globals must be guarded with `isPlatformBrowser` or `typeof window !== 'undefined'`.

Current guarded areas:

- JWT token storage reads and writes.
- Leaflet map loading.
- Swiper custom-element registration.
- Mobile drawer scroll locking and focus restore.
- Share buttons and pagination scroll restoration.

## Checks

Run before deploying:

```bash
npm test -- --watch=false
npm run build:ghpages
npm run build:ghpages:repo
```

Expected build output includes route `index.html` files under `dist/SurePlace/browser`, plus `404.html` for GitHub Pages fallback.
