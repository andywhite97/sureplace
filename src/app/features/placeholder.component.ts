import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeoService } from '../core/services/seo.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="placeholder"><p class="eyebrow">SurePlace</p><h1>{{route.snapshot.data['title']}}</h1><p>{{route.snapshot.data['message']||'This experience is prepared for the next frontend phase.'}}</p>@if(route.snapshot.data['home']){<div><a routerLink="/properties">Browse properties</a><a routerLink="/stays">Explore stays</a></div>}</main>`,
  styles: [
    `.placeholder{width:min(1100px,calc(100% - 2rem));min-height:50vh;margin:auto;padding:clamp(3rem,9vw,7rem) 0}h1{font-size:clamp(2.5rem,7vw,5.5rem);max-width:850px;margin:.4rem 0 1rem}.eyebrow{color:var(--teal);font-weight:800;text-transform:uppercase;letter-spacing:.12em}p{color:var(--slate);font-size:1.1rem}div{display:flex;gap:1rem;margin-top:2rem}a{background:var(--teal);color:white;padding:.8rem 1.1rem;border-radius:var(--radius-sm);text-decoration:none}`,
  ],
})
export class PlaceholderComponent {
  route = inject(ActivatedRoute);
  private seo = inject(SeoService);
  constructor() {
    const title = this.route.snapshot.data['title'] || 'SurePlace';
    const message =
      this.route.snapshot.data['message'] || 'This SurePlace experience is prepared for the next frontend phase.';
    this.seo.apply({
      title,
      description: message,
      path: `/${this.route.snapshot.routeConfig?.path || ''}`,
      robots: 'index, follow',
    });
  }
}
