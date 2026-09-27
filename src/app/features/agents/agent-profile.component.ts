import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';

import { AgentsApiService, AgentDetail } from '../../core/api/agents-api.service';
import { MessagingApiService } from '../../core/api/messaging-api.service';
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
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a routerLink="/agents"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i> Agents</a>
          <span aria-hidden="true">/</span>
          <span>{{ profile.name }}</span>
        </nav>
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
            <button type="button" class="primary" (click)="message()"><i class="fa-regular fa-message" aria-hidden="true"></i> Message</button>
            @if (profile.phone) {
              <a class="secondary" [href]="'tel:' + profile.phone"><i class="fa-solid fa-phone" aria-hidden="true"></i> Call</a>
            }
            <button type="button" class="secondary" (click)="share()"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Share</button>
          </div>
        </header>

        <nav class="profile-nav" aria-label="Profile sections">
          <a [routerLink]="['/agents', profile.id]" fragment="overview">Overview</a>
          <a [href]="'/agents/' + profile.id + '#listings'" (click)="scrollToListings($event)">Listings <span>{{ activeListings().length }}</span></a>
        </nav>

        <div class="content-grid">
          <section id="overview" class="card overview">
            <p class="section-kicker">About</p>
            <h2>Local property expertise, made clear.</h2>
            @if (profile.bio) {
              <p class="about-copy">{{ profile.bio }}</p>
            } @else {
              <p class="about-copy muted">This agent has not added a public biography yet.</p>
            }
            <div class="stats-grid">
              <div><i class="fa-solid fa-building" aria-hidden="true"></i><span>Active listings</span><strong>{{ profile.active_listings_count }}</strong></div>
            </div>
          </section>

          <aside class="side-stack">
            @if (profile.service_areas.length) {
              <section class="card details-card">
                <h2>Areas served</h2>
                <ul class="area-list">
                  @for (area of profile.service_areas; track area) {
                    <li><i class="fa-solid fa-location-dot" aria-hidden="true"></i>{{ area }}</li>
                  }
                </ul>
              </section>
            }
            @if (profile.agency) {
              <section class="card agency-card">
                <p class="section-kicker">Agency</p>
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
              </section>
            }
            @if (profile.phone) {
              <section class="card details-card contact-card">
                <h2>Contact</h2>
                <a [href]="'tel:' + profile.phone"><i class="fa-solid fa-phone" aria-hidden="true"></i>{{ profile.phone }}</a>
              </section>
            }
          </aside>
        </div>

        <section id="listings" class="card listings-panel" tabindex="-1">
          <div class="section-header">
            <div><p class="section-kicker">On the market</p><h2>Active listings <span>({{ activeListings().length }})</span></h2></div>
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
    .page { max-width: 1240px; margin: 0 auto; padding: 1.2rem 1rem 4.5rem; color: var(--midnight); }
    .breadcrumb { display:flex; align-items:center; gap:.55rem; margin:0 0 .85rem; color:var(--slate); font-size:.82rem; }
    .breadcrumb a { color:var(--teal); font-weight:750; text-decoration:none; }
    .card { background: #fff; border: 1px solid rgba(21,43,42,.08); border-radius: 1rem; box-shadow: 0 12px 30px rgba(21,43,42,.055); }
    .hero { min-height:0; display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem; padding:1.5rem; margin-bottom:.85rem; border-top:4px solid var(--teal); }
    .identity-block { display:flex; gap:1rem; align-items:flex-start; }
    .avatar-wrap { flex-shrink:0; }
    .avatar-fallback, .avatar-wrap img { width: 5.5rem; height:5.5rem; border-radius: 50%; display:grid; place-items:center; background: linear-gradient(135deg, rgba(15,157,131,.16), rgba(40,120,208,.14)); font-weight:800; font-size:1.5rem; color:var(--midnight); }
    .avatar-wrap img { object-fit: cover; }
    .identity-copy { display:flex; flex-direction:column; gap:.42rem; min-width:0; }
    h1 { margin:0; color:var(--midnight); letter-spacing:-.035em; font-size: clamp(2rem, 4vw, 3rem); }
    .agency-line { margin:0; color:var(--midnight); font-weight:750; }
    .areas, .tagline { margin:0; color:var(--slate); }
    .badge { display:inline-flex; align-items:center; gap:.3rem; padding:.25rem .55rem; border-radius:999px; font-size:.72rem; font-weight:700; width:max-content; }
    .verified-agent { background: rgba(40,120,208,.12); color:var(--verification); }
    .verified-agency { background: rgba(15,157,131,.12); color: var(--teal); }
    .actions-wrap { min-width:10rem; display:grid; align-content:start; gap:.55rem; }
    button.primary, a.primary, a.secondary, button.secondary { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; padding:.8rem 1rem; border-radius:.7rem; font-weight:750; text-decoration:none; border:1px solid transparent; }
    button.primary, a.primary { background: linear-gradient(135deg, var(--teal), #078e82); color:#fff; box-shadow:0 8px 16px rgba(15,157,131,.18); }
    a.secondary, button.secondary { background:#fff; border-color: rgba(21,43,42,.12); color: var(--midnight); }
    .profile-nav { display:flex; gap:1.35rem; padding:0 .35rem; border-bottom:1px solid var(--line); margin-bottom:1rem; }
    .profile-nav a { padding:.8rem .1rem; border-bottom:2px solid transparent; color:var(--slate); font-size:.88rem; font-weight:750; text-decoration:none; }
    .profile-nav a:first-child { border-color:var(--teal); color:var(--teal); }
    .profile-nav span { color:var(--slate); font-size:.75rem; }
    .content-grid { display:grid; grid-template-columns:minmax(0, 1.7fr) minmax(280px, .85fr); gap: 1rem; margin-bottom:1rem; }
    .overview, .agency-card, .details-card, .listings-panel { padding:1.35rem; }
    .listings-panel { scroll-margin-top: 1rem; }
    h2 { margin:0; color:var(--midnight); font-size:1.25rem; }
    .section-kicker { margin:0 0 .35rem; color:var(--teal); font-size:.72rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
    .about-copy { max-width:56ch; margin:1rem 0 1.25rem; color:var(--slate); line-height:1.6; }
    .muted { font-style:italic; }
    .stats-grid { display:grid; grid-template-columns:minmax(0, 13rem); gap:.75rem; }
    .stats-grid div { display:grid; grid-template-columns:auto 1fr; align-items:center; column-gap:.7rem; background:var(--mist); border-radius:.8rem; padding:.8rem; border:1px solid rgba(21,43,42,.08); }
    .stats-grid i { grid-row:span 2; color:var(--teal); font-size:1.1rem; }
    .stats-grid span { display:block; color:var(--slate); font-size:.8rem; }
    .stats-grid strong { font-size:1.4rem; }
    .side-stack { display:grid; align-content:start; gap:1rem; }
    .area-list { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:.55rem; margin:.9rem 0 0; padding:0; list-style:none; color:var(--slate); font-size:.85rem; }
    .area-list li { display:flex; gap:.4rem; align-items:center; }
    .area-list i { color:var(--teal); font-size:.72rem; }
    .mini-header { display:flex; gap:.75rem; align-items:center; border-bottom:1px solid rgba(21,43,42,.08); padding-bottom:.8rem; margin-bottom:.75rem; }
    .mini-fallback, .mini-header img { width:3rem; height:3rem; border-radius:50%; display:grid; place-items:center; background: rgba(15,157,131,.12); color:var(--midnight); font-weight:700; }
    .mini-header img { object-fit: cover; }
    .agency-card > p:last-child { color:var(--slate); line-height:1.55; font-size:.88rem; }
    .contact-card a { display:flex; align-items:center; gap:.55rem; margin-top:.85rem; color:var(--teal); font-size:.88rem; font-weight:750; text-decoration:none; }
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; }
    .listing-row { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:.8rem; }
    .listing-card { background: #fff; border:1px solid rgba(21,43,42,.08); border-radius:.8rem; overflow:hidden; cursor:pointer; transition:transform .2s ease, box-shadow .2s ease; }
    .listing-card:hover { transform:translateY(-2px); box-shadow:0 10px 22px rgba(21,43,42,.1); }
    .cover-wrap { aspect-ratio: 4/3; background: var(--mist); }
    .cover-wrap img, .cover-placeholder { width:100%; height:100%; object-fit:cover; }
    .cover-placeholder { display:grid; place-items:center; font-size:2rem; color: var(--slate); }
    .listing-body { padding:.75rem; }
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
    @media (max-width: 860px) { .content-grid { grid-template-columns:1fr; } .listing-row { grid-template-columns:repeat(2, minmax(0,1fr)); } .hero { flex-direction:column; } .actions-wrap { grid-template-columns:repeat(3, minmax(0,1fr)); width:100%; } }
    @media (max-width: 560px) { .page { padding:.9rem .7rem 3rem; } .hero { padding:1.1rem; } .identity-block { flex-direction:column; } .actions-wrap { grid-template-columns:repeat(2, minmax(0,1fr)); } .actions-wrap .primary { grid-column:1 / -1; } .listing-row { display:flex; overflow-x:auto; padding-bottom:.3rem; scroll-snap-type:x proximity; } .listing-card { flex:0 0 min(78vw, 18rem); scroll-snap-align:start; } .area-list { grid-template-columns:1fr; } }
  `,
})
export class AgentProfileComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(AgentsApiService);
  private auth = inject(AuthService);
  private messaging = inject(MessagingApiService);
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
              path: `/agents/${agent.id}`,
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

  scrollToListings(event: Event) {
    event.preventDefault();
    const profile = this.agent();
    if (!profile) return;

    void this.router.navigate(['/agents', profile.id], { fragment: 'listings' }).then(() => {
      requestAnimationFrame(() => {
        const listings = document.getElementById('listings');
        listings?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        listings?.focus({ preventScroll: true });
      });
    });
  }

  message() {
    const profile = this.agent();
    if (!profile) return;
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/agents/${profile.id}` } });
      return;
    }
    this.messaging.createForAgent(profile.id, `Hi ${profile.name}, I'd like to discuss a property opportunity.`).subscribe({
      next: (conversation) => void this.router.navigate(['/account/messages', conversation.id]),
      error: () => this.toast.show('Could not start the conversation.', 'error'),
    });
  }

  share() {
    const profile = this.agent();
    if (!profile) return;
    const url = `${window.location.origin}/agents/${profile.id}`;
    if (navigator.share) {
      void navigator.share({ title: profile.name, text: `View ${profile.name}'s profile on SurePlace`, url });
    } else if (navigator.clipboard) {
      void navigator.clipboard.writeText(url).then(() => this.toast.show('Profile link copied.', 'success'));
    }
  }
}
