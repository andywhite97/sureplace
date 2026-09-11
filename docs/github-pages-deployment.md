# GitHub Pages Deployment

SurePlace is an Angular static app with build-time prerendering and client hydration. GitHub Pages hosts only compiled static files, while the Django API runs separately on Render under `/api/v1/`.

## Production Shape

```text
GitHub Pages custom domain -> Angular static prerendered files
Hydrated Angular app       -> Browser-side routes and JWT auth
Angular API calls          -> Render Django HTTPS API
Render Django emails       -> FRONTEND_BASE_URL links back to the app
```

SurePlace production uses the custom domain `sureplace.twinpeaksinvestment.com`. That keeps public URLs clean, for example `https://sureplace.twinpeaksinvestment.com/properties`, and lets the Angular base href remain `/`.

## Current Project Configuration

- Angular project name: `SurePlace`
- Build builder: `@angular/build:application`
- Output mode: static, with Angular server rendering used only at build time for prerendering
- Configured output path: Angular default, detected as `dist/SurePlace` or `dist/SurePlace/browser`
- Routing mode: normal path-based Angular routing
- SPA catch-all route: `**` routes to the Angular not-found page
- Service worker/PWA: not configured
- Runtime Node/Express SSR server: not configured
- Local API base: `src/environments/environment.ts` uses `/api/v1` through the local proxy
- Production API base: `src/environments/environment.production.ts`

## Required Production Values

Before production deployment, replace the placeholder in `src/environments/environment.production.ts` with the public Render API URL:

```ts
apiBaseUrl: 'https://YOUR-RENDER-BACKEND.onrender.com/api/v1';
```

Keep the `/api/v1` suffix and use HTTPS. In this frontend, `apiBaseUrl` intentionally has no trailing slash because API service paths add their own leading slash. Do not put backend secrets, API keys, database URLs, Redis credentials, or Bird credentials in Angular environment files.

## Custom Domain Deployment

The custom-domain build must use base href `/`:

```bash
npm run build:ghpages
```

Set `GH_PAGES_CUSTOM_DOMAIN` when you want the build output to include `CNAME`:

```bash
GH_PAGES_CUSTOM_DOMAIN=sureplace.twinpeaksinvestment.com npm run build:ghpages
```

The domain value must be only the hostname. Do not include `https://` or a trailing slash.

## Repository Pages Deployment

Repository Pages URLs use a repo path:

```text
https://<username>.github.io/<repo>/
```

For SurePlace, the documented fallback repo name is `sureplace`. Override it if the repository name differs:

```bash
GH_PAGES_REPO_NAME=sureplace npm run build:ghpages:repo
```

This builds with base href `/sureplace/` and still creates `404.html` for SPA route fallback.

## Prerendering And Hydration

Production builds use Angular static output mode with a server entry point at `src/main.server.ts`. This produces prerendered HTML during `ng build` and then hydrates into the normal browser app after load. There is no server process in production.

Currently prerendered public routes:

- `/`
- `/properties`
- `/stays`
- `/agents`
- `/verification`
- `/login`
- `/register`

Private/authenticated routes remain client-rendered, including:

- `/account`
- `/account/**`
- `/messages`
- `/bookings`
- `/forgot-password`
- `/reset-password`

Dynamic listing detail routes use `PrerenderFallback.Client`:

- `/properties/:slug`
- `/stays/:slug`

During a production build, `src/app/app.routes.server.ts` tries to fetch public listing slugs from the production API. If the API is unavailable or rejects the request, the build logs a warning and ships those detail routes through the GitHub Pages `404.html` client fallback instead of failing.

To override the API used for build-time slug discovery:

```bash
SUREPLACE_PRERENDER_API_BASE=https://example.com/api/v1 npm run build:ghpages
```

The value should include `/api/v1` and should not include a trailing slash.

## SPA Fallback

GitHub Pages cannot rewrite every route to `index.html`. The deployment prep script copies the compiled `index.html` to `404.html`, so direct navigation and refresh work for routes such as:

- `/properties`
- `/properties/:slug`
- `/stays`
- `/stays/:slug`
- `/account`
- `/account/messages`
- `/account/manage`
- `/register`
- `/login`

Angular still handles truly unknown routes through the existing `**` not-found route after the SPA loads.

## GitHub Actions

The workflow lives at `.github/workflows/deploy-ghpages.yml` and runs on pushes to `main` plus manual `workflow_dispatch`.

It performs:

```text
npm ci
npm test -- --watch=false
npm run build:ghpages
node scripts/prepare-ghpages.mjs --mode custom
actions/upload-pages-artifact
actions/deploy-pages
```

`npm run build:ghpages` builds with base href `/`, prerenders static routes, writes `404.html`, and writes `CNAME` when `GH_PAGES_CUSTOM_DOMAIN` is set. The workflow runs the prepare script again to expose the Pages artifact path to GitHub Actions.

Repository settings must use:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

Set repository variable `GH_PAGES_CUSTOM_DOMAIN` if using a custom domain. Set optional repository variable `SUREPLACE_PRERENDER_API_BASE` only when slug discovery should use a different public API base than `environment.production.ts`. Non-secret public URLs can be GitHub Actions variables. Do not store backend secrets in frontend variables.

## Manual Deployment

Local manual deployment is available through `angular-cli-ghpages`:

```bash
npm run deploy:ghpages
```

Run it from the frontend project directory. Set `GH_PAGES_CUSTOM_DOMAIN` first if the custom-domain deployment should include `CNAME`.

For SurePlace's production custom domain on PowerShell:

```powershell
$env:GH_PAGES_CUSTOM_DOMAIN = 'sureplace.twinpeaksinvestment.com'
npm run deploy:ghpages
```

## Backend Settings

The Render backend must allow the deployed frontend origins. CORS origins are origin-only and must not include path segments.

Custom domain example:

```env
CORS_ALLOWED_ORIGINS=https://sureplace.twinpeaksinvestment.com
CSRF_TRUSTED_ORIGINS=https://sureplace.twinpeaksinvestment.com
FRONTEND_BASE_URL=https://sureplace.twinpeaksinvestment.com
```

Repository Pages example:

```env
CORS_ALLOWED_ORIGINS=https://andywhite97.github.io
CSRF_TRUSTED_ORIGINS=https://andywhite97.github.io
FRONTEND_BASE_URL=https://andywhite97.github.io/sureplace
```

SurePlace primarily uses JWT auth, but `CSRF_TRUSTED_ORIGINS` should still be configured for any cookie-backed or CSRF-protected Django behavior.

## DNS And HTTPS

In GitHub Pages settings, add the custom domain. Configure DNS with your registrar or DNS provider:

- Use a `CNAME` record for a subdomain.
- Use GitHub's current documented `A` and `AAAA` records for an apex domain.
- Enable `Enforce HTTPS` after DNS verification succeeds.

Do not use an HTTP Render API URL from the production frontend, or browsers will block mixed-content requests.

## Troubleshooting

Assets 404 after deployment: check the build base href. Custom domain must use `/`; repo Pages must use `/<repo>/`.

Refreshing `/properties` shows GitHub 404: confirm the deployed artifact contains `404.html` copied from `index.html`.

Refreshing a dynamic detail URL shows the app shell before data loads: confirm whether the build could fetch slugs. A 400, timeout, or network failure in slug discovery means that route correctly fell back to client rendering.

API requests are blocked by the browser: check Django `CORS_ALLOWED_ORIGINS`.

Password reset links point to localhost: update backend `FRONTEND_BASE_URL`.

API requests hit the GitHub Pages domain: check `environment.production.ts` and confirm `apiBaseUrl` points to Render.

Custom domain works but assets fail: rebuild with base href `/`.

Deployment succeeds but the old site appears: confirm Pages source is GitHub Actions, then allow for browser or CDN cache.
