# SurePlace frontend

Angular standalone SPA for the SurePlace marketplace. The current frontend includes its responsive homepage and search entry, reusable property/stay cards, authentication, API configuration, route placeholders, and shared UI states. Full search-results and listing-detail screens remain intentionally out of scope.

## Requirements

- Node.js and npm compatible with Angular 22
- SurePlace Django API running at `http://localhost:8000`

## Local development

```bash
npm install
npm start
```

Open `http://localhost:4200`. The development server proxies `/api` to Django using `proxy.conf.json`, avoiding local CORS and cookie-origin issues. Set the backend's allowed origin to `http://localhost:4200` as documented in its `.env.example`.

Runtime API requests use `src/environments/environment.ts`. Local development uses `/api/v1` through the Angular proxy. Production replaces it with `environment.production.ts`, which must point at the public Render API URL and keep the `/api/v1` suffix.

## GitHub Pages deployment

Production GitHub Pages deployment is documented in `docs/github-pages-deployment.md`. The preferred production mode is a custom domain with base href `/`; repository Pages fallback is also supported with base href `/<repo>/`.

Useful scripts:

```bash
npm run build:prod
npm run build:ghpages
npm run build:ghpages:repo
npm run deploy:ghpages
```

## Verification

```bash
npm test -- --watch=false
npm run build -- --configuration development
npm run build -- --configuration production
```

No lint target is configured yet. Strict Angular template and TypeScript checks run as part of each build.

## Authentication

Access and refresh tokens are centralized in `TokenStorage`. The default is session storage; selecting “Remember me” uses local storage. The HTTP interceptor only adds authorization to the configured first-party API path, coordinates one refresh request for concurrent failures, retries once, and returns users to login when refresh fails. User profile data is held in signals rather than persisted in browser storage.

## Search and maps

Property search state is encoded in `/properties` query parameters, so filters, sorting, pagination, list/map mode, and explicit map bounds can be restored and shared. Leaflet uses OpenStreetMap tiles and requires no commercial API key. Core location/type searches receive descriptive titles; production should emit a canonical `/properties` URL for highly parameterized variants unless curated SEO landing pages are introduced later.

## Brand assets

Approved logo and favicon files live in `public/` and are referenced directly without alteration.

The local homepage hero image is `public/hero-eswatini-home.png`; production code does not depend on third-party image URLs. Listing imagery continues to come from the backend's media/Cloudinary-compatible URLs.
