import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';

import { AgentsApiService, AgentDetail } from '../../core/api/agents-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'sp-agent-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (loading()) {
      <section class="page state">
        <div class="card skeleton-card">
          <div class="skeleton avatar"></div>
          <div class="skeleton line"></div>
          <div class="skeleton line short"></div>
        </div>
      </section>
    } @else if (notFound()) {
      <section class="page state">
        <div class="card empty-card">
          <h1>Agent not found</h1>
          <p>The public profile you requested is no longer available.</p>
          <a class="primary" routerLink="/agents">Back to agents</a>
        </div>
      </section>
    } @else if (agent(); as profile) {
      <section class="page">
        <header class="hero card">
          <div class="identity-block">
            <div class="avatar-wrap">
              @if (profile.avatar) {
                <img [src]="profile.avatar" [alt]="profile.name" />
              } @else {
                <div class="avatar-fallback">{{ initials(profile.name) }}</div>
              }
            </div>
            <div class="identity-copy">
              <h1>{{ profile.name }}</h1>
              @if (profile.verified_agent) {
                <span class="badge verified-agent"><i class="fa-solid fa-check"></i> Verified Agent</span>
              }
              @if (profile.agency) {
                <p class="agency-line">{{ profile.agency.name }}</p>
                @if (profile.verified_agency) {
                  <span class="badge verified-agency"><i class="fa-solid fa-shield-check"></i> Verified Agency</span>
                }
              }
              <p class="areas">{{ serviceAreas(profile) }}</p>
              @if (profile.bio) {
                <p class="tagline">{{ profile.bio }}</p>
              }
            </div>
          </div>

          <div class="actions-wrap">
            <button type="button" class="primary" (click)="message()">Message</button>
            @if (profile.phone) {
              <a class="secondary" [href]="'tel:' + profile.phone">Call</a>
            }
            <button type="button" class="secondary" (click)="share()">Share</button>
          </div>
        </header>

        <div class="content-grid">
          <section class="card overview">
            <h2>Overview</h2>
            <div class="stats-grid">
              <div><span>Active listings</span><strong>{{ profile.active_listings_count }}</strong></div>
              <div><span>Published properties</span><strong>{{ activeListings().length }}</strong></div>
            </div>

            @if (profile.bio) {
              <div class="block">
                <h3>About</h3>
                <p>{{ profile.bio }}</p>
              </div>
            }

            @if (serviceAreas(profile)) {
              <div class="block">
                <h3>Areas served</h3>
                <ul class="list">
                  @for (area of profile.service_areas; track area) {
                    <li>{{ area }}</li>
                  }
                </ul>
              </div>
            }
          </section>

          @if (profile.agency) {
            <aside class="card agency-card">
              <h2>Agency</h2>
              <div class="mini-header">
                @if (profile.agency.logo) {
                  <img [src]="profile.agency.logo" [alt]="profile.agency.name" />
                } @else {
                  <div class="mini-fallback">{{ initials(profile.agency.name) }}</div>
                }
                <div>
                  <h3>{{ profile.agency.name }}</h3>
                  @if (profile.verified_agency) {
                    <span class="badge verified-agency"><i class="fa-solid fa-shield-check"></i> Verified Agency</span>
                  }
                </div>
              </div>
              @if (profile.agency_description) {
                <p>{{ profile.agency_description }}</p>
              }
              <a class="text-link" [routerLink]="['/agencies', profile.agency.slug || profile.agency.id]">View agency profile</a>
            </aside>
          }
        </div>

        <section class="card listings-panel">
          <div class="section-header">
            <h2>Active listings ({{ activeListings().length }})</h2>
          </div>

          @if (activeListings().length) {
            <div class="listing-row">
              @for (listing of activeListings(); track listing.id) {
                <article class="listing-card" [routerLink]="['/properties', listing.slug]" tabindex="0" (keydown.enter)="goListing(listing.slug)" (keydown.space)="$event.preventDefault(); goListing(listing.slug)">
                  <div class="cover-wrap">
                    @if (listing.cover_image) {
                      <img [src]="listing.cover_image" [alt]="listing.title" />
                    } @else {
                      <div class="cover-placeholder"><i class="fa-solid fa-house"></i></div>
                    }
                  </div>
                  <div class="listing-body">
                    <span class="listing-type">{{ listing.listing_type === 'RENT' ? 'For rent' : 'For sale' }}</span>
                    <h3>{{ listing.title }}</h3>
                    <p class="listing-meta">{{ listing.town }}{{ listing.suburb ? ' · ' + listing.suburb : '' }}</p>
                    <p class="listing-price">{{ formatPrice(listing) }}</p>
                    <div class="listing-specs">
                      @if (listing.bedrooms !== null) {
                        <span><i class="fa-solid fa-bed"></i> {{ listing.bedrooms }}</span>
                      }
                      @if (listing.bathrooms !== null) {
                        <span><i class="fa-solid fa-bath"></i> {{ listing.bathrooms }}</span>
                      }
                    </div>
                  </div>
                </article>
              }
            </div>
          } @else {
            <div class="empty-listings">
              <p>No active listings right now.</p>
            </div>
          }
        </section>
      </section>
    }
  `,
  styles: `
    :host { display:block; }
    .page { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem 4rem; color: var(--midnight); }
    .card { background: rgba(255,255,255,.9); border: 1px solid rgba(21,43,42,.08); border-radius: 1rem; box-shadow: 0 10px 30px rgba(21,43,42,.04); }
    .hero { display:flex; justify-content:space-between; gap:1rem; padding:1.5rem; margin-bottom:1.25rem; }
    .identity-block { display:flex; gap:1rem; align-items:flex-start; }
    .avatar-wrap { flex-shrink:0; }
    .avatar-fallback, .avatar-wrap img { width: 5.5rem; height:5.5rem; border-radius: 50%; display:grid; place-items:center; background: linear-gradient(135deg, rgba(15,157,131,.16), rgba(40,120,208,.14)); font-weight:800; font-size:1.5rem; color:var(--midnight); }
    .avatar-wrap img { object-fit: cover; }
    .identity-copy { display:flex; flex-direction:column; gap:.4rem; }
    h1 { margin:0; font-size: clamp(2rem, 4vw, 3rem); }
    .agency-line { margin:0; font-weight:700; }
    .areas, .tagline { margin:0; color:var(--slate); }
    .badge { display:inline-flex; align-items:center; gap:.3rem; padding:.25rem .55rem; border-radius:999px; font-size:.72rem; font-weight:700; width:max-content; }
    .verified-agent { background: rgba(40,120,208,.12); color:var(--verification); }
    .verified-agency { background: rgba(15,157,131,.12); color: var(--teal); }
    .actions-wrap { display:flex; align-items:flex-start; gap:.6rem; flex-wrap:wrap; }
    button.primary, a.primary, a.secondary, button.secondary { padding:.8rem 1rem; border-radius:.8rem; font-weight:700; text-decoration:none; border:1px solid transparent; }
    button.primary, a.primary { background: var(--teal); color:#fff; }
    a.secondary, button.secondary { background:#fff; border-color: rgba(21,43,42,.12); color: var(--midnight); }
    .content-grid { display:grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom:1rem; }
    .overview, .agency-card, .listings-panel { padding:1.25rem; }
    h2 { margin-top:0; }
    .stats-grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:.75rem; margin-bottom:1rem; }
    .stats-grid div { background: var(--mist); border-radius:.8rem; padding:.8rem; border:1px solid rgba(21,43,42,.08); }
    .stats-grid span { display:block; color:var(--slate); font-size:.8rem; }
    .stats-grid strong { font-size:1.4rem; }
    .block { margin-top:1rem; }
    .block h3 { margin:0 0 .6rem; }
    .list { margin:0; padding-left:1.1rem; color:var(--slate); }
    .mini-header { display:flex; gap:.75rem; align-items:center; border-bottom:1px solid rgba(21,43,42,.08); padding-bottom:.8rem; margin-bottom:.75rem; }
    .mini-fallback, .mini-header img { width:3rem; height:3rem; border-radius:50%; display:grid; place-items:center; background: rgba(15,157,131,.12); color:var(--midnight); font-weight:700; }
    .mini-header img { object-fit: cover; }
    .text-link { color: var(--teal); font-weight:700; text-decoration: none; }
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .listing-row { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:1rem; }
    .listing-card { background: #fff; border:1px solid rgba(21,43,42,.08); border-radius:.9rem; overflow:hidden; cursor:pointer; }
    .cover-wrap { aspect-ratio: 4/3; background: var(--mist); }
    .cover-wrap img, .cover-placeholder { width:100%; height:100%; object-fit:cover; }
    .cover-placeholder { display:grid; place-items:center; font-size:2rem; color: var(--slate); }
    .listing-body { padding:.8rem; }
    .listing-type { display:inline-block; font-size:.7rem; text-transform: uppercase; letter-spacing:.08em; color:var(--teal); font-weight:700; }
    .listing-body h3 { margin:.35rem 0 .2rem; font-size:1rem; }
    .listing-meta, .listing-price { margin:0; color: var(--slate); }
    .listing-price { margin-top:.4rem; font-weight:700; color:var(--midnight); }
    .listing-specs { display:flex; gap:.6rem; flex-wrap:wrap; font-size:.78rem; color:var(--slate); margin-top:.55rem; }
    .empty-listings { text-align:center; color:var(--slate); padding:1rem 0; }
    .state { display:grid; place-items:center; min-height:50vh; }
    .empty-card { padding: 2rem; text-align:center; }
    .skeleton-card { display:flex; align-items:center; gap:1rem; padding:2rem; width:min(720px, 100%); }
    .skeleton { position:relative; overflow:hidden; border-radius:.8rem; background: rgba(100,116,113,.12); }
    .skeleton::after { content:''; position:absolute; inset:0; transform:translateX(-100%); background:linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent); animation: shimmer 1.2s infinite; }
    .skeleton.avatar { width:5rem; height:5rem; border-radius:50%; }
    .skeleton.line { height:1rem; width: 14rem; }
    .skeleton.line.short { width: 9rem; }
    @keyframes shimmer { 100% { transform:translateX(100%); } }
    @media (max-width: 860px) { .content-grid { grid-template-columns: 1fr; } .listing-row { grid-template-columns: repeat(2, minmax(0,1fr)); } .hero { flex-direction:column; } .actions-wrap { justify-content:flex-start; } }
    @media (max-width: 480px) { .listing-row { grid-template-columns: 1fr; } .identity-block { flex-direction:column; } .actions-wrap { width:100%; } .actions-wrap > * { flex:1; text-align:center; } }
  `,
})
export class AgentProfileComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(AgentsApiService);
  private auth = inject(AuthService);
  private seo = inject(SeoService);
  private toast = inject(ToastService);

  agent = signal<AgentDetail | null>(null);
  loading = signal(true);
  notFound = signal(false);

  activeListings = computed(() => this.agent()?.active_listings ?? []);

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id') || params.get('slug') || '';
          if (!id) {
            this.notFound.set(true);
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          this.notFound.set(false);
          return this.api.detail(id).pipe(
            catchError(() => of(null)),
            finalize(() => this.loading.set(false)),
          );
        }),
        tap((agent) => {
          this.agent.set(agent || null);
          this.notFound.set(!agent);
          if (agent) {
            const title = `${agent.name} | Property Agent in ${agent.service_areas[0] || 'Eswatini'} | SurePlace`;
            this.seo.apply({
              title,
              description: `${agent.name} is a ${agent.verified_agent ? 'verified' : 'trusted'} property professional${agent.agency ? ` at ${agent.agency.name}` : ''}.`,
              path: `/agents/${agent.slug || agent.id}`,
              type: 'article',
            });
          }
        }),
      )
      .subscribe();
  }

  initials(name: string) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('') || 'A';
  }

  serviceAreas(profile: AgentDetail) {
    return (profile.service_areas && profile.service_areas.length ? profile.service_areas : ['Eswatini']).join(' · ');
  }

  formatPrice(listing: AgentDetail['active_listings'][number]) {
    return `${listing.currency} ${Number(listing.price).toLocaleString()}`;
  }

  goListing(slug: string) {
    void this.router.navigate(['/properties', slug]);
  }

  message() {
    const profile = this.agent();
    if (!profile) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/agents/${profile.slug || profile.id}` } });
      return;
    }
    void this.router.navigate(['/account/messages']);
    this.toast.show('Open the message centre to continue the conversation.', 'info');
  }

  share() {
    const profile = this.agent();
    if (!profile) return;
    const url = `${window.location.origin}/agents/${profile.slug || profile.id}`;
    if (navigator.share) {
      void navigator.share({ title: profile.name, text: `View ${profile.name}'s profile on SurePlace`, url });
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => this.toast.show('Profile link copied.', 'success'));
    }
  }
}
