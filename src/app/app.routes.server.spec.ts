import '@angular/compiler';
import { PrerenderFallback, RenderMode, ServerRoute } from '@angular/ssr';
import { collectPublishedSlugs, serverRoutes } from './app.routes.server';
import { environment } from '../environments/environment';

describe('serverRoutes', () => {
  const originalFetch = globalThis.fetch;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    warn.mockRestore();
  });

  it('prerenders public shell routes', () => {
    for (const path of ['', 'properties', 'stays', 'login', 'register', 'agents']) {
      expect(route(path)?.renderMode).toBe(RenderMode.Prerender);
    }
  });

  it('keeps private routes client-rendered', () => {
    expect(route('account')?.renderMode).toBe(RenderMode.Client);
    expect(route('account/**')?.renderMode).toBe(RenderMode.Client);
    expect(route('messages')?.renderMode).toBe(RenderMode.Client);
    expect(route('bookings')?.renderMode).toBe(RenderMode.Client);
    expect(route('verify-email')?.renderMode).toBe(RenderMode.Client);
    expect(route('verify-email/pending')?.renderMode).toBe(RenderMode.Client);
  });

  it('prerenders detail routes and falls back to CSR for unknown slugs', () => {
    const property = route('properties/:slug');
    const stay = route('stays/:slug');

    expect(property?.renderMode).toBe(RenderMode.Prerender);
    expect((property as { fallback: PrerenderFallback } | undefined)?.fallback).toBe(
      PrerenderFallback.Client,
    );
    expect(stay?.renderMode).toBe(RenderMode.Prerender);
    expect((stay as { fallback: PrerenderFallback } | undefined)?.fallback).toBe(
      PrerenderFallback.Client,
    );
  });

  it('collects paginated public slugs and removes duplicates', async () => {
    const firstUrl = `${environment.apiBaseUrl.replace(/\/$/, '')}/properties/`;
    globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
      if (String(url) === firstUrl) {
        return response({
          next: `${firstUrl}?page=2`,
          results: [{ slug: 'one' }, { slug: 'two' }],
        });
      }
      return response({ next: null, results: [{ slug: 'two' }, { slug: 'three' }] });
    }) as never;

    await expect(collectPublishedSlugs('/properties/')).resolves.toEqual(['one', 'two', 'three']);
  });

  it('returns no dynamic slugs when the public API is unavailable', async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error('offline');
    }) as never;

    await expect(collectPublishedSlugs('/stays/')).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Dynamic routes will fall back to CSR'),
      expect.any(Error),
    );
  });
});

function route(path: string): ServerRoute | undefined {
  return serverRoutes.find((item) => item.path === path);
}

function response(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}
