import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { formatMoney } from '../../shared/listing/price-format';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';
import { SeoService } from '../../core/services/seo.service';
import { listingDescription } from '../../shared/listing/listing-seo';

interface PublicAgency {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string;
  town: string;
  region: string;
  suburb: string;
  phone: string;
  email: string;
  website: string;
  verification_status: string;
}
interface AgencyProperty {
  slug: string;
  title: string;
  town: string;
  price: string;
  currency: string;
  cover_image: string | null;
}
interface AgencyStay {
  slug: string;
  name: string;
  town: string;
  cover_image: string | null;
}
interface PublicAgencyDetail {
  agency: PublicAgency;
  property_count: number;
  stay_count: number;
  properties: AgencyProperty[];
  stays: AgencyStay[];
}

@Component({
  selector: 'sp-public-agency',
  standalone: true,
  imports: [RouterLink, SmartImageComponent],
  template: `
    <main class="agency-page">
      <nav class="crumb" aria-label="Breadcrumb">
        <a routerLink="/">Home</a><span aria-hidden="true">/</span> Agency
      </nav>
      @if (loading()) {
        <section class="card state" role="status">Loading agency profile…</section>
      } @else if (error()) {
        <section class="card state">
          <h1>Agency unavailable</h1>
          <p>This profile may no longer be public.</p>
          <a routerLink="/agents">Browse agents</a>
        </section>
      } @else if (detail(); as profile) {
        <header class="card agency-hero">
          <div class="identity">
            @if (profile.agency.logo) {
              <img class="logo" [src]="profile.agency.logo" [alt]="profile.agency.name + ' logo'" />
            } @else {
              <div class="logo fallback" aria-hidden="true">
                <i class="fa-solid fa-building"></i>
              </div>
            }
            <div>
              <p class="eyebrow">SurePlace agency</p>
              <h1>{{ profile.agency.name }}</h1>
              <p class="location">{{ location(profile.agency) }}</p>
              @if (profile.agency.verification_status === 'VERIFIED') {
                <span class="badge"
                  ><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Verified
                  agency</span
                >
              }
            </div>
          </div>
          <div class="contact">
            @if (profile.agency.phone) {
              <a [href]="'tel:' + profile.agency.phone"
                ><i class="fa-solid fa-phone" aria-hidden="true"></i> Call agency</a
              >
            }
            @if (profile.agency.email) {
              <a [href]="'mailto:' + profile.agency.email"
                ><i class="fa-regular fa-envelope" aria-hidden="true"></i> Email agency</a
              >
            }
            @if (profile.agency.website) {
              <a [href]="profile.agency.website" target="_blank" rel="noopener noreferrer"
                ><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                Website</a
              >
            }
          </div>
        </header>
        <div class="body-grid">
          <div class="content">
            <section class="card about">
              <p class="eyebrow">About the agency</p>
              <h2>Local expertise, clearly presented.</h2>
              <p>
                {{
                  profile.agency.description ||
                    'This agency has not added a public description yet.'
                }}
              </p>
            </section>
            <section class="card listings">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">On the market</p>
                  <h2>
                    Properties <span>({{ profile.property_count }})</span>
                  </h2>
                </div>
              </div>
              @if (profile.properties.length) {
                <div class="tiles">
                  @for (property of profile.properties; track property.slug) {
                    <a class="tile" [routerLink]="['/properties', property.slug]">
                      <sp-image [src]="property.cover_image" [alt]="property.title" />
                      <div>
                        <strong>{{ property.title }}</strong
                        ><small>{{ property.town }}</small
                        ><span>{{ formatMoney(property.price, property.currency) }}</span>
                      </div>
                    </a>
                  }
                </div>
              } @else {
                <p class="muted">No active properties right now.</p>
              }
            </section>
            <section class="card listings">
              <div class="section-heading">
                <div>
                  <p class="eyebrow">Accommodation</p>
                  <h2>
                    Stays <span>({{ profile.stay_count }})</span>
                  </h2>
                </div>
              </div>
              @if (profile.stays.length) {
                <div class="tiles">
                  @for (stay of profile.stays; track stay.slug) {
                    <a class="tile" [routerLink]="['/stays', stay.slug]">
                      <sp-image [src]="stay.cover_image" [alt]="stay.name" />
                      <div>
                        <strong>{{ stay.name }}</strong
                        ><small>{{ stay.town }}</small>
                      </div>
                    </a>
                  }
                </div>
              } @else {
                <p class="muted">No active stays right now.</p>
              }
            </section>
          </div>
          <aside class="card side">
            <h2>Agency at a glance</h2>
            <dl>
              <div>
                <dt>Properties</dt>
                <dd>{{ profile.property_count }}</dd>
              </div>
              <div>
                <dt>Stays</dt>
                <dd>{{ profile.stay_count }}</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>
                  {{
                    profile.agency.verification_status === 'VERIFIED' ? 'Verified' : 'Not verified'
                  }}
                </dd>
              </div>
            </dl>
            <a [routerLink]="['/agents']" [queryParams]="{ agency: profile.agency.id }"
              >Meet the agents <span aria-hidden="true">→</span></a
            >
          </aside>
        </div>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        background: #f5faf9;
        color: var(--midnight);
      }
      .agency-page {
        max-width: 1200px;
        margin: auto;
        padding: 1.25rem 1rem 4rem;
      }
      .crumb {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
        color: var(--slate);
        font-size: 0.85rem;
      }
      a {
        color: var(--teal);
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
        box-shadow: 0 10px 28px rgba(4, 43, 40, 0.05);
      }
      .state {
        padding: 3rem 1.5rem;
        text-align: center;
      }
      .agency-hero {
        display: flex;
        justify-content: space-between;
        gap: 1.5rem;
        align-items: center;
        padding: 1.5rem;
        border-top: 4px solid var(--teal);
      }
      .identity {
        display: flex;
        gap: 1.1rem;
        align-items: center;
        min-width: 0;
      }
      .logo {
        width: 5.5rem;
        height: 5.5rem;
        flex: none;
        object-fit: contain;
        border-radius: 0.8rem;
        background: #ecf8f4;
      }
      .fallback {
        display: grid;
        place-items: center;
        color: var(--teal);
        font-size: 2rem;
      }
      .eyebrow {
        color: var(--teal);
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 850;
        margin: 0 0 0.4rem;
      }
      h1,
      h2,
      p,
      dl {
        margin: 0;
      }
      h1 {
        font-size: clamp(1.8rem, 4vw, 2.7rem);
      }
      h2 {
        font-size: 1.2rem;
      }
      .location,
      .muted {
        color: var(--slate);
      }
      .location {
        margin: 0.35rem 0;
      }
      .badge {
        display: inline-flex;
        gap: 0.4rem;
        align-items: center;
        border-radius: 100px;
        padding: 0.3rem 0.6rem;
        background: #e7f8f2;
        color: #087564;
        font-weight: 750;
        font-size: 0.8rem;
      }
      .contact {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      .contact a,
      .side a {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border: 1px solid var(--line);
        border-radius: 0.55rem;
        padding: 0.65rem 0.85rem;
        font-weight: 750;
      }
      .contact a:hover,
      .side a:hover {
        background: #e7f8f2;
        text-decoration: none;
      }
      .body-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 290px;
        gap: 1rem;
        align-items: start;
        margin-top: 1rem;
      }
      .content {
        display: grid;
        gap: 1rem;
        min-width: 0;
      }
      .about,
      .listings,
      .side {
        padding: 1.3rem;
      }
      .about p:last-child {
        line-height: 1.6;
        color: var(--slate);
        margin-top: 0.8rem;
        white-space: pre-wrap;
      }
      .section-heading {
        margin-bottom: 1rem;
      }
      .section-heading span {
        color: var(--slate);
        font-size: 0.9rem;
      }
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(195px, 1fr));
        gap: 0.75rem;
      }
      .tile {
        display: block;
        min-width: 0;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        color: var(--midnight);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
      }
      .tile:hover {
        transform: translateY(-2px);
        box-shadow: 0 9px 18px rgba(4, 43, 40, 0.12);
        text-decoration: none;
      }
      .tile sp-image {
        display: block;
      }
      .tile div {
        display: grid;
        gap: 0.3rem;
        padding: 0.8rem;
      }
      .tile strong {
        overflow-wrap: anywhere;
      }
      .tile small {
        color: var(--slate);
      }
      .side {
        display: grid;
        gap: 1rem;
      }
      .side dl {
        display: grid;
        gap: 0.7rem;
      }
      .side dl div {
        display: flex;
        justify-content: space-between;
        gap: 0.5rem;
        border-top: 1px solid var(--line);
        padding-top: 0.7rem;
      }
      .side dt {
        color: var(--slate);
      }
      .side dd {
        font-weight: 800;
      }
      @media (max-width: 800px) {
        .agency-hero {
          align-items: flex-start;
          flex-direction: column;
        }
        .body-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 480px) {
        .identity {
          align-items: flex-start;
        }
        .logo {
          width: 4rem;
          height: 4rem;
        }
      }
    `,
  ],
})
export class PublicAgencyComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ApiClient);
  private seo = inject(SeoService);
  detail = signal<PublicAgencyDetail | null>(null);
  loading = signal(true);
  error = signal(false);
  readonly formatMoney = formatMoney;

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.loading.set(true);
          this.error.set(false);
          this.detail.set(null);
          this.seo.apply({
            title: 'Agency profile',
            description: 'Property agencies on SurePlace.',
            robots: 'noindex, follow',
            image: null,
          });
          return this.api
            .get<PublicAgencyDetail>(
              `/public-agencies/${encodeURIComponent(params.get('slug') || '')}/`,
            )
            .pipe(
              catchError(() => {
                this.error.set(true);
                return of(null);
              }),
              finalize(() => this.loading.set(false)),
            );
        }),
      )
      .subscribe((detail) => {
        this.detail.set(detail);
        if (!detail) return;
        const agency = detail.agency;
        const path = `/agencies/${agency.slug}`;
        const url = this.seo.absoluteUrl(path);
        this.seo.apply({
          title: `${agency.name} in ${agency.town || 'Eswatini'}`,
          description: listingDescription(
            agency.description ||
              `Explore properties, stays and agents from ${agency.name} in ${this.location(agency)}.`,
          ),
          path,
          image: agency.logo || undefined,
          imageAlt: `${agency.name} logo`,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'RealEstateAgent',
            name: agency.name,
            description: agency.description,
            url,
            image: agency.logo ? this.seo.absoluteImageUrl(agency.logo) : undefined,
            telephone: agency.phone || undefined,
            address: {
              '@type': 'PostalAddress',
              addressLocality: agency.town,
              addressRegion: agency.region,
              addressCountry: 'SZ',
            },
          },
        });
      });
  }

  location(agency: PublicAgency) {
    return [agency.suburb, agency.town, agency.region].filter(Boolean).join(', ') || 'Eswatini';
  }
}
