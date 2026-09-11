import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let title: Title;

  beforeEach(() => {
    document.head
      .querySelectorAll(
        'meta[name], meta[property], link[rel="canonical"], script[type="application/ld+json"][data-sureplace-jsonld]',
      )
      .forEach((node) => node.remove());
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
  });

  it('applies canonical, social tags and local noindex policy', () => {
    service.apply({
      title: 'Properties in Eswatini',
      description: 'Browse verified property listings.',
      path: '/properties?listing_type=RENT',
      image: '/hero-eswatini-home.jpg',
    });

    expect(title.getTitle()).toBe('Properties in Eswatini | SurePlace');
    expect(meta('description')).toBe('Browse verified property listings.');
    expect(meta('robots')).toBe('noindex, nofollow');
    expect(prop('og:url')).toBe('http://localhost:4200/properties?listing_type=RENT');
    expect(prop('og:image')).toBe('http://localhost:4200/hero-eswatini-home.jpg');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'http://localhost:4200/properties?listing_type=RENT',
    );
  });

  it('replaces stale canonical and json ld tags', () => {
    service.apply({
      title: 'First',
      description: 'First description',
      path: '/first',
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'First' },
    });
    service.apply({
      title: 'Second',
      description: 'Second description',
      path: '/second',
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Second' },
    });

    const canonicals = document.querySelectorAll('link[rel="canonical"]');
    const scripts = document.querySelectorAll(
      'script[type="application/ld+json"][data-sureplace-jsonld]',
    );
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0].getAttribute('href')).toBe('http://localhost:4200/second');
    expect(scripts).toHaveLength(1);
    expect(scripts[0].textContent).toContain('"name":"Second"');
    expect(scripts[0].textContent).not.toContain('First');
  });
});

function meta(name: string) {
  return TestBed.inject(Meta).getTag(`name="${name}"`)?.getAttribute('content');
}

function prop(property: string) {
  return TestBed.inject(Meta).getTag(`property="${property}"`)?.getAttribute('content');
}
