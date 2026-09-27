import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfigApiService } from '../core/api/config-api.service';
import { FooterNavGroup, FooterSocialLink } from '../core/models/api.models';
import { ListingEntryService } from '../core/services/listing-entry.service';
import { CookieConsentService } from '../core/services/cookie-consent.service';

@Component({
  selector: 'sp-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="site-footer">
      <div class="footer-main">
        <section class="brand-block" aria-labelledby="footer-brand">
          <a class="brand" routerLink="/" id="footer-brand" aria-label="SurePlace home">
            <img src="/logo_light.png" alt="SurePlace" width="420" height="140" />
          </a>
          <p>A trusted place to find property and stays in Eswatini. Simple, reliable and built for you.</p>
          <ul class="trust-list">
            <li><i class="fa-solid fa-house" aria-hidden="true"></i> Buy, rent or stay</li>
            <li><i class="fa-solid fa-users" aria-hidden="true"></i> Connect with trusted agents</li>
            <li><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Verified listings and agencies</li>
            <li><i class="fa-solid fa-heart" aria-hidden="true"></i> A safer, simpler experience</li>
          </ul>
        </section>

        <nav class="footer-navigation" aria-label="Footer navigation">
          @for (group of groups(); track group.key) {
            <section class="footer-group" [class.is-open]="openGroup() === group.key">
              <button type="button" class="group-toggle" [attr.aria-expanded]="openGroup() === group.key" [attr.aria-controls]="'footer-group-' + group.key" (click)="toggleGroup(group.key)">
                <span>{{ sectionTitle(group.key) }}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>
              <div class="group-links" [id]="'footer-group-' + group.key">
                @for (item of group.items; track item.label) {
                  @if (isListingEntryRoute(item.route)) {
                    <button type="button" (click)="startListing(item.route)">{{ item.label }}</button>
                  } @else if (item.route) {
                    <a [routerLink]="item.route">{{ item.label }}</a>
                  } @else if (item.external_url) {
                    <a [href]="item.external_url" [target]="item.opens_in_new_tab ? '_blank' : null" [rel]="item.opens_in_new_tab ? 'noopener noreferrer' : null">{{ item.label }}</a>
                  }
                }
              </div>
            </section>
          }
        </nav>

        @if (socialLinks().length || newsletterEnabled()) {
          <section class="footer-connect" aria-labelledby="footer-connect-title">
            @if (newsletterEnabled()) {
              <div class="newsletter">
                <h2 id="footer-connect-title">Stay in the loop</h2>
                <p>Get the latest properties, stays and SurePlace updates.</p>
              </div>
            }
            @if (socialLinks().length) {
              <div class="social-links" aria-label="Social links">
                @for (social of socialLinks(); track social.platform) {
                  <a [href]="social.url" [target]="social.opens_in_new_tab ? '_blank' : null" [rel]="social.opens_in_new_tab ? 'noopener noreferrer' : null" [attr.aria-label]="social.platform">
                    <i [class]="socialIcon(social)" aria-hidden="true"></i>
                  </a>
                }
              </div>
            }
          </section>
        }
      </div>

      <div class="footer-bottom">
        <p>© {{ year }} SurePlace. All rights reserved.</p>
        <p class="pride"><span><i aria-hidden="true">🇸🇿</i> Proudly Eswatini</span><b aria-hidden="true">|</b><span>Property. People. Progress.</span></p>
        <button type="button" class="cookie-preferences" (click)="cookies.openPreferences()">Cookie preferences</button>
        <button type="button" class="back-to-top" aria-label="Back to top" (click)="backToTop()">
          <i class="fa-solid fa-arrow-up" aria-hidden="true"></i><span>Back to top</span>
        </button>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; }
    .site-footer { background: var(--midnight); color: #fff; }
    .footer-main, .footer-bottom { width: min(1280px, calc(100% - 2.5rem)); margin: 0 auto; }
    .footer-main { display: grid; grid-template-columns: minmax(220px, 1.45fr) minmax(0, 4fr) minmax(205px, 1.2fr); gap: 2rem; padding: 4.5rem 0 3.8rem; }
    .brand { display: inline-flex; align-items: center; min-height: 44px; color: #fff; text-decoration: none; }
    .brand img { display: block; width: min(11.5rem, 100%); height: auto; object-fit: contain; }
    .brand-block > p { max-width: 18rem; margin: 1.25rem 0 1.3rem; color: #c3d5d1; font-size: .83rem; line-height: 1.55; }
    .trust-list { display: grid; gap: .7rem; padding: 0; margin: 0; list-style: none; color: #d2e0dd; font-size: .74rem; }
    .trust-list i { width: 1.1rem; margin-right: .45rem; color: #58d4bd; text-align: center; }
    .footer-navigation { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.25rem; }
    .footer-group h2, .footer-connect h2 { margin: 0 0 .9rem; font-size: .86rem; }
    .group-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0; border: 0; background: transparent; color: #fff; font: inherit; font-weight: 800; text-align: left; }
    .group-toggle i { display: none; }
    .group-links { display: grid; gap: .6rem; }
    .group-links a, .group-links button { color: #b9ceca; font: inherit; font-size: .76rem; line-height: 1.35; text-align: left; text-decoration: none; transition: color .18s ease; }
    .group-links button { width: max-content; max-width: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; }
    .group-links a:hover, .group-links a:focus-visible, .group-links button:hover, .group-links button:focus-visible { color: #63dfc6; outline: 0; }
    .footer-connect { border-left: 1px solid rgba(198, 226, 220, .2); padding-left: 1.25rem; }
    .newsletter p { margin: 0; color: #c3d5d1; font-size: .76rem; line-height: 1.45; }
    .social-links { display: flex; gap: .55rem; margin-top: 1.3rem; }
    .social-links a { width: 2rem; height: 2rem; display: grid; place-items: center; border: 1px solid rgba(198, 226, 220, .28); border-radius: .45rem; color: #d8e7e4; text-decoration: none; }
    .social-links a:hover, .social-links a:focus-visible { border-color: var(--teal); color: #63dfc6; outline: 0; }
    .footer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 0 1.25rem; border-top: 1px solid rgba(198, 226, 220, .17); color: #a7c1bc; font-size: .68rem; }
    .footer-bottom p { margin: 0; }
    .pride { display: flex; align-items: center; gap: .45rem; }
    .pride span{display:inline-flex;align-items:center;gap:.35rem}.pride i{font-style:normal}
    .pride b { color: #66827c; font-weight: 400; }
    .back-to-top { display: inline-flex; align-items: center; gap: .5rem; border: 0; background: transparent; color: #d4e4e0; font: inherit; font-size: .68rem; cursor: pointer; }
    .back-to-top i { width: 1.65rem; height: 1.65rem; display: grid; place-items: center; border: 1px solid rgba(198, 226, 220, .28); border-radius: 50%; }
    .back-to-top:hover, .back-to-top:focus-visible { color: #63dfc6; outline: 0; }
    .cookie-preferences{border:0;background:transparent;color:#d4e4e0;font:inherit;font-size:.68rem;cursor:pointer}.cookie-preferences:hover,.cookie-preferences:focus-visible{color:#63dfc6;outline:0}
    @media (max-width: 1100px) { .footer-main { grid-template-columns: minmax(220px, 1.4fr) minmax(0, 3fr); } .footer-navigation { grid-template-columns:repeat(3,minmax(0,1fr)); } .footer-connect { grid-column:2; border-left:0; border-top:1px solid rgba(198, 226, 220, .2); padding:1.5rem 0 0; } }
    @media (max-width: 767px) {
      .footer-main, .footer-bottom { width: min(100% - 2rem, 34rem); }
      .footer-main { display: block; padding: 2.5rem 0 1.25rem; }
      .brand-block > p { margin: 1rem 0; }
      .trust-list { gap: .55rem; }
      .footer-navigation { display: block; margin-top: 2rem; border-top: 1px solid rgba(198, 226, 220, .18); }
      .footer-group { border-bottom: 1px solid rgba(198, 226, 220, .18); }
      .group-toggle { min-height: 3.15rem; padding: .1rem 0; cursor: pointer; }
      .group-toggle i { display: block; color: #70dcca; font-size: .7rem; transition: transform .18s ease; }
      .footer-group.is-open .group-toggle i { transform: rotate(180deg); }
      .group-links { display: none; padding: 0 0 1rem; }
      .footer-group.is-open .group-links { display: grid; }
      .group-links a, .group-links button { padding: .2rem 0; font-size: .82rem; }
      .footer-connect { display: block; padding: 1.5rem 0 0; border: 0; }
      .social-links { margin-top: 0; }
      .footer-bottom { display: grid; grid-template-columns: 1fr auto; padding: 1rem 0 1.5rem; }
      .footer-bottom p:first-child { grid-column: 1 / -1; order: 2; }
      .pride { display: grid; gap: .15rem; order: 1; }
      .pride b { display: none; }
      .back-to-top { order: 1; align-self: center; }
      .back-to-top span { display: none; }
    }
  `],
})
export class FooterComponent {
  private config = inject(ConfigApiService);
  private listingEntry = inject(ListingEntryService);
  cookies = inject(CookieConsentService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  openGroup = signal<string | null>(null);
  year = new Date().getFullYear();

  groups = computed<FooterNavGroup[]>(() =>
    this.config.config().footer.navigation_groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.is_active &&
            (item.route || item.external_url) &&
            !this.isPlaceholderRoute(item.label, item.route),
        ),
      }))
      .filter((group) => group.items.length > 0)
      .sort((a, b) => a.order - b.order),
  );
  socialLinks = computed<FooterSocialLink[]>(() =>
    this.config.config().footer.social_links.filter((social) => social.is_active && this.socialIcon(social)),
  );
  newsletterEnabled = computed(() => this.config.config().footer.newsletter.enabled === true);

  constructor() {
    this.config.load().subscribe();
  }

  toggleGroup(key: string) {
    this.openGroup.update((current) => (current === key ? null : key));
  }

  socialIcon(social: FooterSocialLink) {
    const icons: Record<string, string> = {
      facebook: 'fa-brands fa-facebook-f',
      instagram: 'fa-brands fa-instagram',
      linkedin: 'fa-brands fa-linkedin-in',
      youtube: 'fa-brands fa-youtube',
    };
    return icons[social.platform.toLowerCase()] ?? '';
  }

  sectionTitle(key: string) {
    const titles: Record<string, string> = {
      explore: 'Explore',
      owners: 'For Owners',
      support: 'Support',
      company: 'Company',
      legal: 'Legal',
    };
    return titles[key] ?? key;
  }

  isListingEntryRoute(route: string | null) {
    return route === this.listingEntry.propertyRoute || route === this.listingEntry.stayRoute;
  }

  startListing(route: string | null) {
    if (route === this.listingEntry.propertyRoute) {
      void this.listingEntry.startPropertyListing();
    } else if (route === this.listingEntry.stayRoute) {
      void this.listingEntry.startStayListing();
    }
  }

  private isPlaceholderRoute(label: string, route: string | null) {
    return route === '/' && ['about', 'help'].includes(label.trim().toLowerCase());
  }

  backToTop() {
    if (!isPlatformBrowser(this.platformId)) return;
    const prefersReducedMotion = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.document.defaultView?.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }
}
