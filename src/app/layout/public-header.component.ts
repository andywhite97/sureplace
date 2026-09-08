import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Params, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { ConfigApiService } from '../core/api/config-api.service';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';

type NavItem = { label: string; commands: string | unknown[]; queryParams?: Params; feature?: 'stays' | 'bookings' | 'internal_messaging' | 'registration'; badge?: 'messages' | 'notifications'; action?: 'logout'; icon?: string; cta?: 'primary' | 'secondary' };
type NavSection = { title: string; items: NavItem[] };

@Component({
  selector: 'sp-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `<header><a routerLink="/" class="logo" aria-label="SurePlace home" (click)="closeMenu()"><img src="/logo_dark.png" alt="SurePlace"></a>
    <nav class="desktop-nav" aria-label="Main navigation"><a routerLink="/properties" routerLinkActive="active">Buy</a><a routerLink="/properties" [queryParams]="{listing_type:'RENT'}" routerLinkActive="active">Rent</a>@if(config.config().features.stays){<a routerLink="/stays" routerLinkActive="active">Stays</a>}<a routerLink="/agents" routerLinkActive="active">Agents</a><a routerLink="/account/saved" routerLinkActive="active">Saved</a>@if(config.config().features.internal_messaging){<a routerLink="/account/messages" routerLinkActive="active">Messages</a>}</nav>
    <div class="actions">@if(auth.isAuthenticated()){<a routerLink="/account">{{auth.user()?.first_name||'Account'}}</a><button type="button" (click)="auth.logout()">Log out</button>}@else{<a routerLink="/login">Log in</a>@if(config.config().features.registration){<a routerLink="/register">Register</a>}}<a class="cta" [routerLink]="primaryCta().commands">{{primaryCta().label}}</a></div>
    <button #menuButton class="menu-button" type="button" aria-label="Open menu" aria-controls="mobile-menu" [attr.aria-expanded]="menuOpen()" (click)="openMenu()"><i class="fa-solid fa-bars" aria-hidden="true"></i></button>
  </header>
  @if(menuOpen()){<div class="backdrop" (click)="closeMenu()" aria-hidden="true"></div><aside #drawer id="mobile-menu" class="drawer" role="dialog" aria-modal="true" aria-label="SurePlace navigation" tabindex="-1" (keydown)="trapFocus($event)">
    <div class="drawer-head"><a routerLink="/" class="logo" aria-label="SurePlace home" (click)="closeMenu()"><img src="/logo_dark.png" alt="SurePlace"></a><button class="icon-button" type="button" aria-label="Close menu" (click)="closeMenu()"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>
    <nav aria-label="Mobile navigation">
      @for(section of mobileSections(); track section.title){
        <section>
          <h2>{{section.title}}</h2>
          @for(item of visible(section.items); track item.label){
            @if(item.action === 'logout'){
              <button type="button" (click)="logout()"><span><i [class]="item.icon || 'fa-solid fa-right-from-bracket'" aria-hidden="true"></i>{{item.label}}</span></button>
            }@else{
              <a [routerLink]="item.commands" [queryParams]="item.queryParams" [class.current]="isActive(item)" [class.secondary-cta]="item.cta === 'secondary'" [class.primary-cta]="item.cta === 'primary'" [attr.aria-current]="isActive(item) ? 'page' : null" (click)="closeMenu()">
                <span><i [class]="item.icon || 'fa-regular fa-circle'" aria-hidden="true"></i>{{item.label}}</span>
                @if(badge(item.badge)){<b>{{badge(item.badge)}}</b>}
              </a>
            }
          }
        </section>
      }
    </nav>
  </aside>}`,
  styles: [
    `header{height:72px;display:flex;align-items:center;gap:2rem;padding:0 max(1.25rem,calc((100vw - 1200px)/2));background:white;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:80}.logo{display:flex;align-items:center;min-height:44px}.logo img{display:block;width:auto;height:42px;max-width:170px;object-fit:contain}.desktop-nav,.actions{display:flex;align-items:center;gap:1.3rem}.actions{margin-left:auto}.cta{background:var(--teal);color:white!important;padding:.7rem 1rem;border-radius:var(--radius-sm)}a,button{color:var(--midnight);font-weight:650;text-decoration:none;background:none;border:0;font:inherit;cursor:pointer}.active{color:var(--teal)}.menu-button{display:none;margin-left:auto;width:44px;height:44px;border:1px solid var(--line);border-radius:var(--radius-sm);place-items:center;background:#fff;font-size:1.2rem}.icon-button{width:44px;height:44px;display:grid;place-items:center;border:1px solid var(--line);border-radius:var(--radius-sm);padding:0;font-size:1.25rem}.menu-button:focus-visible,.drawer a:focus-visible,.drawer button:focus-visible{outline:3px solid color-mix(in srgb,var(--teal) 38%,transparent);outline-offset:2px}.backdrop{position:fixed;inset:0;z-index:100;background:#152b2a99}.drawer{position:fixed;z-index:110;top:0;right:0;bottom:0;width:min(88vw,390px);display:grid;grid-template-rows:auto 1fr;background:#fff;box-shadow:-20px 0 45px rgba(21,43,42,.18);padding:calc(.65rem + env(safe-area-inset-top)) max(1.25rem,env(safe-area-inset-right)) calc(.75rem + env(safe-area-inset-bottom)) max(1.25rem,env(safe-area-inset-left));overflow:auto}.drawer-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;border-bottom:1px solid var(--line);padding-bottom:.55rem}.drawer-head .logo img{height:auto;width:120px;max-width:42vw}.drawer nav{display:grid;gap:1.25rem;padding-top:.7rem;align-content:start}.drawer section{display:grid;gap:.12rem}.drawer h2{margin:0 0 .45rem;color:var(--slate);font-size:.7rem;text-transform:uppercase;letter-spacing:.04em;font-weight:850}.drawer a,.drawer nav button{min-height:50px;display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-radius:.7rem;padding:.5rem .75rem;text-align:left;transition:background var(--transition),color var(--transition),box-shadow var(--transition)}.drawer a:hover,.drawer nav button:hover{background:var(--mist)}.drawer a:active,.drawer nav button:active{background:color-mix(in srgb,var(--teal) 10%,white)}.drawer a span,.drawer nav button span{display:flex;align-items:center;gap:.9rem;min-width:0;font-size:1rem}.drawer a i,.drawer nav button i{width:30px;text-align:center;color:var(--teal);font-size:1.12rem}.drawer a.current{background:color-mix(in srgb,var(--teal) 9%,white);color:var(--midnight);box-shadow:inset 4px 0 0 var(--teal);font-weight:800}.drawer a.primary-cta,.drawer a.secondary-cta{width:100%;justify-content:center;margin-top:.45rem;font-weight:850}.drawer a.secondary-cta{background:color-mix(in srgb,var(--teal) 8%,white);border:1px solid color-mix(in srgb,var(--teal) 42%,var(--line));color:var(--teal)}.drawer a.primary-cta{min-height:54px;margin-top:.65rem;background:var(--teal);color:#fff}.drawer a.primary-cta span,.drawer a.secondary-cta span{justify-content:center}.drawer a.primary-cta i{color:#fff}.drawer b{min-width:1.45rem;text-align:center;border-radius:999px;background:var(--teal);color:#fff;font-size:.7rem;padding:.15rem .35rem}@media(max-width:850px){header{height:64px;padding-inline:1rem}.desktop-nav,.actions{display:none}.menu-button{display:grid}.logo img{height:36px;max-width:145px}}@media(max-width:340px){.drawer{width:90vw;padding-inline:1rem}.drawer a span,.drawer nav button span{gap:.75rem}.drawer a i,.drawer nav button i{width:28px}}`,
  ],
})
export class PublicHeaderComponent {
  auth = inject(AuthService);
  config = inject(ConfigApiService);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private activity = inject(AccountActivityStore);
  menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  menuOpen = signal(false);
  currentUrl = signal(this.router.url);
  private scrollY = 0;
  private previousAuthState = this.auth.isAuthenticated();
  hasSupplyAccess = computed(() => (this.auth.user()?.onboarding_intents || []).some((intent) => ['PROPERTY_AGENT', 'PROPERTY_OWNER'].includes(intent)));
  primaryCta = computed<NavItem>(() => this.auth.isAuthenticated() && this.hasSupplyAccess() ? { label: 'Manage Listings', commands: '/account/manage' } : this.auth.isAuthenticated() ? { label: 'List a Property', commands: '/account/manage/properties/new' } : { label: 'List a Property', commands: '/account' });
  mobileSections = computed<NavSection[]>(() => this.auth.isAuthenticated() ? this.authenticatedSections() : this.anonymousSections());

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => { this.currentUrl.set(event.urlAfterRedirects); this.closeMenu(false); });
    effect(() => {
      const authenticated = this.auth.isAuthenticated();
      if (authenticated !== this.previousAuthState) {
        this.previousAuthState = authenticated;
        this.closeMenu(false);
      }
    });
  }

  anonymousSections(): NavSection[] {
    return [
      { title: 'Explore', items: [{ label: 'Home', commands: '/', icon: 'fa-solid fa-house' }, { label: 'Rent', commands: '/properties', queryParams: { listing_type: 'RENT' }, icon: 'fa-solid fa-key' }, { label: 'Buy', commands: '/properties', queryParams: { listing_type: 'SALE' }, icon: 'fa-solid fa-building' }, { label: 'Stays', commands: '/stays', feature: 'stays', icon: 'fa-solid fa-bed' }, { label: 'Agents', commands: '/agents', icon: 'fa-solid fa-user-tie' }] },
      { title: 'Account', items: [{ label: 'Login', commands: '/login', icon: 'fa-solid fa-right-to-bracket' }, { label: 'Create Account', commands: '/register', feature: 'registration', icon: 'fa-solid fa-user-plus', cta: 'secondary' }, { label: 'List a Property', commands: '/account', icon: 'fa-solid fa-plus', cta: 'primary' }] },
    ];
  }

  authenticatedSections(): NavSection[] {
    const sections: NavSection[] = [
      { title: 'Explore', items: [{ label: 'Home', commands: '/', icon: 'fa-solid fa-house' }, { label: 'Rent', commands: '/properties', queryParams: { listing_type: 'RENT' }, icon: 'fa-solid fa-key' }, { label: 'Buy', commands: '/properties', queryParams: { listing_type: 'SALE' }, icon: 'fa-solid fa-building' }, { label: 'Stays', commands: '/stays', feature: 'stays', icon: 'fa-solid fa-bed' }, { label: 'Saved', commands: '/account/saved', icon: 'fa-solid fa-heart' }, { label: 'Messages', commands: '/account/messages', feature: 'internal_messaging', badge: 'messages', icon: 'fa-solid fa-message' }] },
      { title: 'Account', items: [{ label: 'My Account', commands: '/account', icon: 'fa-solid fa-circle-user' }, { label: 'Saved Searches / Alerts', commands: '/account/alerts', icon: 'fa-solid fa-bell' }, { label: 'Viewings', commands: '/account/viewings', icon: 'fa-solid fa-calendar-check' }, { label: 'Bookings', commands: '/account/bookings', feature: 'bookings', icon: 'fa-solid fa-suitcase' }, { label: 'Notifications', commands: '/account/notifications', badge: 'notifications', icon: 'fa-solid fa-inbox' }, { label: 'Profile', commands: '/account/profile', icon: 'fa-solid fa-id-card' }, { label: 'Settings', commands: '/account/settings', icon: 'fa-solid fa-gear' }, { label: 'Logout', commands: '#', action: 'logout', icon: 'fa-solid fa-right-from-bracket' }] },
    ];
    if (this.hasSupplyAccess()) sections.push({ title: 'Manage Listings', items: [{ label: 'Management Dashboard', commands: '/account/manage', icon: 'fa-solid fa-gauge-high' }, { label: 'Properties', commands: '/account/manage/properties', icon: 'fa-solid fa-building-user' }, { label: 'Stays', commands: '/account/manage/stays', feature: 'stays', icon: 'fa-solid fa-hotel' }, { label: 'Viewings', commands: '/account/manage/viewings', icon: 'fa-solid fa-calendar-days' }, { label: 'Bookings', commands: '/account/manage/bookings', feature: 'bookings', icon: 'fa-solid fa-book-open' }, { label: 'Verification', commands: '/account/manage/verification', icon: 'fa-solid fa-shield-halved' }] });
    else sections.push({ title: 'Manage Listings', items: [{ label: 'List a Property', commands: '/account/manage/properties/new', icon: 'fa-solid fa-plus', cta: 'primary' }] });
    return sections;
  }

  visible(items: NavItem[]) { return items.filter((item) => !item.feature || this.config.config().features[item.feature]); }
  badge(kind?: 'messages' | 'notifications') {
    const value = kind === 'messages' ? this.activity.unreadMessages() : kind === 'notifications' ? this.activity.unreadNotifications() : 0;
    return value > 99 ? '99+' : value ? String(value) : '';
  }
  openMenu() {
    this.menuOpen.set(true);
    this.lockScroll();
    setTimeout(() => this.drawer()?.nativeElement.focus());
  }
  closeMenu(returnFocus = true) {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.unlockScroll();
    if (returnFocus) setTimeout(() => this.menuButton()?.nativeElement.focus());
  }
  logout() {
    this.closeMenu(false);
    this.auth.logout();
  }
  isActive(item: NavItem) {
    if (typeof item.commands !== 'string') return false;
    const url = this.currentUrl();
    if (item.queryParams?.['listing_type']) return url.startsWith(item.commands) && url.includes(`listing_type=${item.queryParams['listing_type']}`);
    return url === item.commands || (item.commands !== '/' && url.startsWith(item.commands));
  }
  trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.drawer()?.nativeElement;
    if (!root) return;
    const focusable = Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter((item) => !item.hasAttribute('disabled'));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && this.document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && this.document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  @HostListener('document:keydown.escape') escape() { this.closeMenu(); }
  private lockScroll() {
    const body = this.document.body;
    this.scrollY = window.scrollY || 0;
    body.style.position = 'fixed';
    body.style.top = `-${this.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }
  private unlockScroll() {
    const body = this.document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    if (this.scrollY) {
      try { window.scrollTo(0, this.scrollY); } catch {}
    }
  }
}
