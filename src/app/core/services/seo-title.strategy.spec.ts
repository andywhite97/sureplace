import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { SeoTitleStrategy } from './seo-title.strategy';
import { SeoService } from './seo.service';

@Component({ standalone: true, template: '' })
class Page {}

describe('SEO route privacy', () => {
  it('preserves a public page title applied during activation', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'properties/home', component: Page, title: 'Property | SurePlace' },
        ]),
        { provide: TitleStrategy, useClass: SeoTitleStrategy },
      ],
    });
    TestBed.inject(SeoService).apply({
      title: 'Specific property',
      description: 'A specific listing.',
      path: '/properties/home',
    });
    await TestBed.inject(Router).navigateByUrl('/properties/home');
    expect(document.title).toBe('Specific property | SurePlace');
  });
  it('clears public sharing data on private routes including booking checkout', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'account/messages/:id', component: Page, title: 'Conversation' },
          { path: 'stays/:slug/book', component: Page, title: 'Book your stay' },
        ]),
        { provide: TitleStrategy, useClass: SeoTitleStrategy },
      ],
    });
    const router = TestBed.inject(Router);
    for (const url of ['/account/messages/abc?token=secret', '/stays/hotel/book']) {
      await router.navigateByUrl(url);
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
        'noindex, nofollow',
      );
      expect(document.querySelector('meta[property="og:image"]')).toBeNull();
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).not.toContain(
        'token',
      );
    }
  });
});
