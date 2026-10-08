# SurePlace SEO

SurePlace uses Angular build-time prerendering with browser hydration on GitHub Pages and a Django/DRF backend. `SeoService` writes route metadata into both prerendered HTML and the browser document. Sitemap generation lives in Django where published listing data is available.

## Public Origin

The canonical frontend origin is:

```text
https://sureplace.twinpeaksinvestment.com
```

Production Angular metadata uses `environment.production.ts` for absolute canonical, Open Graph, Twitter, and JSON-LD URLs. Development uses `http://localhost:4200` and forces `noindex,nofollow`.

## Frontend Metadata

`src/app/core/services/seo.service.ts` is the central metadata API. It updates:

- document title and description
- `robots`
- canonical link
- Open Graph tags
- Twitter card tags
- route JSON-LD scripts

The service removes stale canonical and JSON-LD tags before adding new route data. Public browse pages may be indexable when they represent stable location/type pages. Highly filtered or paginated search states use `noindex,follow` and canonicalize back to the clean browse URL.

Private routes such as account, login, registration, and password reset use `noindex,nofollow`.

### Property and stay detail sharing

Both detail pages use the designated cover image for `og:image`, `twitter:image`, and listing JSON-LD. If there is no usable cover, they use the first gallery photo by sort order. A listing without photos uses the default SurePlace sharing image. Captions provide `og:image:alt` and `twitter:image:alt`, with listing identity as a fallback. HTTPS images also include `og:image:secure_url`.

CDN image URLs remain unchanged. Relative `/media/` URLs resolve against the backend origin when the API has an absolute base URL; frontend assets resolve against the canonical frontend origin. Metadata refreshes after a successful retry, and unavailable listings clear stale social images and structured data.

Social crawlers need the metadata in the initial HTML. The production build discovers published property and stay slugs and generates their detail HTML. Rebuild and redeploy after publishing listings or changing covers. Slugs unavailable during the build fall back to client rendering and cannot be relied on for listing-specific social previews; inspect the generated `properties/<slug>/index.html` and `stays/<slug>/index.html` before deployment. See [prerendering.md](prerendering.md).

## Sitemap

The GitHub Pages preparation step generates a sitemap from indexable prerendered canonical pages, served at:

```text
https://sureplace.twinpeaksinvestment.com/sitemap.xml
```

The XML entries use frontend URLs, for example:

```text
https://sureplace.twinpeaksinvestment.com/properties/example-slug
```

The frontend `public/robots.txt` points crawlers to that sitemap. Django also serves a dynamic sitemap at `https://sureplace-back-e1u4.onrender.com/sitemap.xml`, including published listings and active public professionals. Static pages omit `lastmod` unless a real content update date is known.

The frontend sitemap includes only pages actually generated and marked indexable. Draft, paused, account, auth, messages, checkout and management routes are excluded. Public verification information is included. Agent profiles and agencies connected to public agents are discovered during prerendering. Agencies without public agents still render in the browser and are included in the backend sitemap.

The Pages fallback is `noindex,follow`, with homepage canonical and structured data removed. Login and registration are crawlable so search engines can observe their `noindex` tags. Authenticated routes remain protected by route guards and the API; robots rules are not access controls. A router title strategy enforces private metadata on every account, staff, invitation and checkout navigation.

## Deployment Checks

After frontend changes:

```bash
npm test -- --run
npm run build:prod
npm run build:ghpages
```

After backend sitemap changes:

```bash
python manage.py test core.tests_seo
black --check core/seo.py core/tests_seo.py Sureplace_back/urls.py
ruff check core/seo.py core/tests_seo.py Sureplace_back/urls.py
```
