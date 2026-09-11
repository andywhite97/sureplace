import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../core/services/seo.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main><p>404</p><h1>That place isn't here</h1><span>The page may have moved, but your next place is still out there.</span><nav><a routerLink="/">Return home</a><a routerLink="/properties">Browse properties</a><a routerLink="/stays">Browse stays</a></nav></main>`,
  styles: [
    `main{text-align:center;padding:8rem 1rem}p{color:var(--teal);font-weight:800}h1{font-size:clamp(2rem,6vw,4rem);margin:.5rem}span{color:var(--slate)}nav{display:flex;justify-content:center;flex-wrap:wrap;gap:1rem;margin-top:2rem}a{color:var(--teal);font-weight:700}`,
  ],
})
export class NotFoundComponent {
  private seo = inject(SeoService);
  constructor() {
    this.seo.apply({
      title: 'Page not found',
      description: 'The SurePlace page you requested could not be found.',
      path: '/404',
      robots: 'noindex, nofollow',
      image: null,
    });
  }
}
