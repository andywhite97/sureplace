# GitHub Pages Deployment

SurePlace is a pure Angular SPA. GitHub Pages hosts the compiled static frontend, while the Django API runs separately on Render under `/api/v1/`.

## Production Shape

```text
GitHub Pages custom domain -> Angular SPA
Angular API calls           -> Render Django HTTPS API
Render Django emails        -> FRONTEND_BASE_URL links back to the SPA
```

Use a custom domain for production where possible. That keeps public URLs clean, for example `https://sureplace.co.sz/properties`, and lets the Angular base href remain `/`.

## Current Project Configuration

- Angular project name: `SurePlace`
- Build builder: `@angular/build:application`
- Output mode: static
- Configured output path: Angular default, detected as `dist/SurePlace` or `dist/SurePlace/browser`
- Routing mode: normal path-based Angular routing
- SPA catch-all route: `**` routes to the Angular not-found page
- Service worker/PWA: not configured
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
GH_PAGES_CUSTOM_DOMAIN=sureplace.co.sz npm run build:ghpages
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
npm run build:prod -- --base-href /
node scripts/prepare-ghpages.mjs --mode custom
actions/upload-pages-artifact
actions/deploy-pages
```

Repository settings must use:

```text
Settings -> Pages -> Build and deployment -> Source: GitHub Actions
```

Set repository variable `GH_PAGES_CUSTOM_DOMAIN` if using a custom domain. Non-secret public URLs can be GitHub Actions variables. Do not store backend secrets in frontend variables.

## Manual Deployment

Local manual deployment is available through `angular-cli-ghpages`:

```bash
npm run deploy:ghpages
```

Run it from the frontend project directory. Set `GH_PAGES_CUSTOM_DOMAIN` first if the custom-domain deployment should include `CNAME`.

## Backend Settings

The Render backend must allow the deployed frontend origins. CORS origins are origin-only and must not include path segments.

Custom domain example:

```env
CORS_ALLOWED_ORIGINS=https://sureplace.co.sz,https://www.sureplace.co.sz
CSRF_TRUSTED_ORIGINS=https://sureplace.co.sz,https://www.sureplace.co.sz
FRONTEND_BASE_URL=https://sureplace.co.sz
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

API requests are blocked by the browser: check Django `CORS_ALLOWED_ORIGINS`.

Password reset links point to localhost: update backend `FRONTEND_BASE_URL`.

API requests hit the GitHub Pages domain: check `environment.production.ts` and confirm `apiBaseUrl` points to Render.

Custom domain works but assets fail: rebuild with base href `/`.

Deployment succeeds but the old site appears: confirm Pages source is GitHub Actions, then allow for browser or CDN cache.
