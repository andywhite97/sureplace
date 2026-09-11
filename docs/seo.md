# SurePlace SEO

SurePlace uses an Angular SPA on GitHub Pages and a Django/DRF backend. There is no SSR in the current architecture, so route metadata is managed in the browser by `SeoService`, while sitemap generation lives in Django where published listing data is available.

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

## Sitemap

Django serves the dynamic sitemap at:

```text
https://sureplace-back.onrender.com/sitemap.xml
```

The XML entries use frontend URLs, for example:

```text
https://sureplace.twinpeaksinvestment.com/properties/example-slug
```

The frontend `public/robots.txt` points crawlers to that sitemap endpoint. If the production infrastructure later proxies `/sitemap.xml` through the frontend domain, update `public/robots.txt` to reference `https://sureplace.twinpeaksinvestment.com/sitemap.xml`.

Only published property and stay detail pages are included. Draft, paused, account, auth, messages, booking, management, and verification routes are excluded.

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
