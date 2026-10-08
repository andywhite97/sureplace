import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { environment } from '../environments/environment';

type Page<T> = {
  next: string | null;
  results: T[];
};

type SlugResult = {
  slug?: string;
};

type ProcessGlobal = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

const STATIC_PUBLIC_ROUTES = [
  '',
  'properties',
  'stays',
  'login',
  'register',
  'agents',
  'verification',
  'help',
  'about',
  'pricing',
  'terms',
  'privacy',
  'cookies',
] as const;
const PRIVATE_CLIENT_ROUTES = [
  'account',
  'account/**',
  'messages',
  'bookings',
  'forgot-password',
  'reset-password',
  'verify-email',
  'verify-email/pending',
  'agency-invitations/accept',
] as const;

const prerenderApiBase = (
  (globalThis as ProcessGlobal).process?.env?.['SUREPLACE_PRERENDER_API_BASE'] ||
  environment.apiBaseUrl
).replace(/\/$/, '');

const privateClientRoutes: ServerRoute[] = PRIVATE_CLIENT_ROUTES.map((path) => ({
  path,
  renderMode: RenderMode.Client,
}));

const staticPublicRoutes: ServerRoute[] = STATIC_PUBLIC_ROUTES.map((path) => ({
  path,
  renderMode: RenderMode.Prerender,
}));

export const serverRoutes: ServerRoute[] = [
  ...privateClientRoutes,
  {
    path: 'agents/:id',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: () => publicProfileParams('agent'),
  },
  {
    path: 'agencies/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: () => publicProfileParams('agency'),
  },
  {
    path: 'properties/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: () => listingSlugParams('/properties/'),
  },
  {
    path: 'stays/:slug',
    renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,
    getPrerenderParams: () => listingSlugParams('/stays/'),
  },
  ...staticPublicRoutes,
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];

export async function publicProfileParams(kind: 'agent' | 'agency') {
  const values = new Set<string>();
  let url: string | null = `${prerenderApiBase}/agents/`;
  for (let pages = 0; url && pages < 20; pages++) {
    try {
      const page: Page<{ id: string; agency?: { slug: string; is_active?: boolean } | null }> =
        await fetchJson(url);
      for (const item of page.results || []) {
        const value =
          kind === 'agent'
            ? item.id
            : item.agency?.is_active !== false
              ? item.agency?.slug
              : undefined;
        if (value) values.add(value);
      }
      url = page.next;
    } catch (error) {
      console.warn(
        `[prerender] Could not fetch ${kind} profiles. Dynamic routes will fall back to CSR.`,
        error,
      );
      return [];
    }
  }
  return [...values].map((value) => ({ [kind === 'agent' ? 'id' : 'slug']: value }));
}

export async function listingSlugParams(endpoint: '/properties/' | '/stays/') {
  const slugs = await collectPublishedSlugs(endpoint);
  return slugs.map((slug) => ({ slug }));
}

export async function collectPublishedSlugs(endpoint: '/properties/' | '/stays/') {
  const slugs = new Set<string>();
  let url: string | null = `${prerenderApiBase}${endpoint}`;
  let pages = 0;

  while (url && pages < 20) {
    pages += 1;
    try {
      const responsePage: Page<SlugResult> = await fetchJson<Page<SlugResult>>(url);
      const results = responsePage.results || [];
      for (const item of results) {
        if (item.slug) slugs.add(item.slug);
      }
      url = responsePage.next;
    } catch (error) {
      console.warn(
        `[prerender] Could not fetch ${endpoint} slugs from ${url}. Dynamic routes will fall back to CSR.`,
        error,
      );
      return [];
    }
  }

  if (url) {
    console.warn(`[prerender] Stopped collecting ${endpoint} slugs after ${pages} pages.`);
  }

  return [...slugs];
}

async function fetchJson<T>(url: string) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return (await response.json()) as T;
    } catch (error) {
      if (attempt === 1) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Unable to prerender ${url}`);
}
