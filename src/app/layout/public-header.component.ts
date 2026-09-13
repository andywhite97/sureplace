import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NavigationEnd, Params, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import {
  accountNavigation,
  mobileAccountNavigation,
  mobileRouteSection,
  navigationActive,
  unreadBadgeLabel,
  MobileSectionId,
} from '../core/services/account-navigation.config';
import { AgencyNavigationService } from '../core/services/agency-navigation.service';
import { ConfigApiService } from '../core/api/config-api.service';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';

type NavItem = {
  label: string;
  commands: string | unknown[];
  queryParams?: Params;
  feature?: 'stays' | 'bookings' | 'internal_messaging' | 'registration';
  badge?: 'messages' | 'notifications';
  action?: 'logout';
  icon?: string;
  exact?: boolean;
  activePaths?: string[];
  cta?: 'primary' | 'secondary';
};
type SectionId = MobileSectionId;
type NavSection = { title: string; items: NavItem[]; id?: SectionId; icon?: string };
type MenuState = 'closed' | 'open' | 'closing';

@Component({
  selector: 'sp-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `<header [class.staff-header]="staffWorkspace()">
      <a routerLink="/" class="logo" aria-label="SurePlace home" (click)="closeMenu()">
        <img src="/logo_dark.png" alt="SurePlace" width="420" height="140" />
      </a>
      @if (staffWorkspace()) {
        <span class="console-label">Staff Console</span>
        <form class="staff-search" role="search" (submit)="searchStaff($event, staffSearch.value)">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            #staffSearch
            type="search"
            aria-label="Search property listings"
            placeholder="Search listings by title, ID or agency"
          />
          <button type="submit" aria-label="Search listings">
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </form>
        <div class="staff-identity">
          <span class="staff-avatar" aria-hidden="true">{{ staffInitials() }}</span
          ><span>{{ auth.user()?.first_name || 'Staff' }}<small>Staff member</small></span>
        </div>
        <a class="exit-console" aria-label="Exit Console" routerLink="/account"
          ><i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i
          ><span>Exit Console</span></a
        >
      } @else {
        <nav class="desktop-nav" aria-label="Main navigation">
          <a
            routerLink="/properties"
            routerLinkActive="active"
            [attr.aria-current]="isPropertiesActive() ? 'page' : null"
            >Properties</a
          >
          @if (config.config().features.stays) {
            <a routerLink="/stays" routerLinkActive="active">Stays</a>
          }
          <a routerLink="/agents" routerLinkActive="active">Agents</a>
          @if (auth.isAuthenticated()) {
            <a routerLink="/account/saved" routerLinkActive="active">Saved</a>
            @if (config.config().features.internal_messaging) {
              <a routerLink="/account/messages" routerLinkActive="active">Messages</a>
            }
          }
        </nav>
        <div class="actions">
          @if (auth.isAuthenticated()) {
            <a routerLink="/account">{{ auth.user()?.first_name || 'Account' }}</a>
            <button type="button" (click)="auth.logout()">Log out</button>
          } @else if (auth.status() === 'unauthenticated') {
            <a routerLink="/login">Log in</a>
            @if (config.config().features.registration) {
              <a routerLink="/register">Create account</a>
            }
          }
          @if (auth.status() === 'initializing') {
            <span class="auth-placeholder" role="status" aria-label="Loading account"></span>
          } @else {
            <a class="cta" [routerLink]="primaryCta().commands">{{ primaryCta().label }}</a>
          }
        </div>
        <div class="mobile-shortcuts" aria-label="Quick account actions">
          @if (auth.isAuthenticated()) {
            <a routerLink="/account/saved" aria-label="Saved listings">
              <i class="fa-regular fa-heart" aria-hidden="true"></i>
            </a>
          }
          @if (auth.status() !== 'initializing') {
            <a [routerLink]="auth.isAuthenticated() ? '/account' : '/login'" aria-label="Account">
              <i class="fa-solid fa-user" aria-hidden="true"></i>
            </a>
          }
        </div>
      }
      <button
        #menuButton
        class="menu-button"
        type="button"
        aria-label="Open menu"
        aria-controls="mobile-menu"
        [attr.aria-expanded]="menuExpanded()"
        (click)="openMenu()"
      >
        <i class="fa-solid fa-bars" aria-hidden="true"></i>
      </button>
    </header>
    @if (menuRendered()) {
      <div
        class="backdrop"
        [class.is-closing]="menuState() === 'closing'"
        (click)="closeMenu()"
        aria-hidden="true"
      ></div>
      <aside
        #drawer
        id="mobile-menu"
        class="drawer"
        [class.is-closing]="menuState() === 'closing'"
        role="dialog"
        aria-modal="true"
        aria-label="SurePlace navigation"
        tabindex="-1"
        (keydown)="trapFocus($event)"
        (transitionend)="finishClose($event)"
      >
        <div class="drawer-head">
          <a routerLink="/" class="logo" aria-label="SurePlace home" (click)="closeMenu()">
            <img src="/logo_dark.png" alt="SurePlace" width="420" height="140" />
          </a>
          <button class="icon-button" type="button" aria-label="Close menu" (click)="closeMenu()">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          @if (auth.status() === 'initializing') {
            <span class="auth-placeholder" role="status" aria-label="Loading account"></span>
          }
          @for (section of mobileSections(); track section.title) {
            <section>
              @if (section.id) {
                <button
                  type="button"
                  class="accordion-toggle"
                  [class.context-active]="
                    currentSection() === section.id && expandedSection() !== section.id
                  "
                  [attr.aria-expanded]="expandedSection() === section.id"
                  [attr.aria-controls]="'mobile-section-' + section.id"
                  (click)="toggleSection(section.id)"
                >
                  <span><i [class]="section.icon" aria-hidden="true"></i>{{ section.title }}</span>
                  @if (
                    section.id === 'account' &&
                    expandedSection() !== section.id &&
                    badge('notifications')
                  ) {
                    <b [attr.aria-label]="badgeLabel('notifications', badge('notifications'))">{{
                      badge('notifications')
                    }}</b>
                  }
                  <i
                    class="fa-solid fa-chevron-right chevron"
                    [class.expanded]="expandedSection() === section.id"
                    aria-hidden="true"
                  ></i>
                </button>
              } @else if (section.title) {
                <h2>{{ section.title }}</h2>
              }
              <div
                class="section-panel"
                [class.accordion-panel]="!!section.id"
                [class.expanded]="!section.id || expandedSection() === section.id"
                [id]="section.id ? 'mobile-section-' + section.id : null"
                [attr.inert]="section.id && expandedSection() !== section.id ? '' : null"
                [attr.aria-hidden]="section.id && expandedSection() !== section.id ? 'true' : null"
              >
                <div class="section-children">
                  @for (item of visible(section.items); track item.label; let row = $index) {
                    @if (item.action === 'logout') {
                      <button
                        type="button"
                        class="drawer-row logout-row"
                        [style.animation-delay.ms]="drawerRowDelay(row)"
                        (click)="logout()"
                      >
                        <span>
                          <i
                            [class]="item.icon || 'fa-solid fa-right-from-bracket'"
                            aria-hidden="true"
                          ></i>
                          {{ item.label }}
                        </span>
                      </button>
                    } @else {
                      <a
                        class="drawer-row"
                        [routerLink]="item.commands"
                        [queryParams]="item.queryParams"
                        [class.current]="isActive(item)"
                        [class.secondary-cta]="item.cta === 'secondary'"
                        [class.primary-cta]="item.cta === 'primary'"
                        [style.animation-delay.ms]="drawerRowDelay(row)"
                        [attr.aria-current]="isActive(item) ? 'page' : null"
                        (click)="closeMenu()"
                      >
                        <span>
                          <i [class]="item.icon || 'fa-regular fa-circle'" aria-hidden="true"></i>
                          {{ item.label }}
                        </span>
                        @if (badge(item.badge)) {
                          <b [attr.aria-label]="badgeLabel(item.badge, badge(item.badge))">{{
                            badge(item.badge)
                          }}</b>
                        }
                      </a>
                    }
                  }
                </div>
              </div>
            </section>
          }
        </nav>
      </aside>
    }`,
  styles: [
    `
      header {
        height: 72px;
        display: flex;
        align-items: center;
        gap: 2rem;
        padding: 0 max(1.25rem, calc((100vw - 1200px) / 2));
        background: white;
        border-bottom: 1px solid var(--line);
        position: sticky;
        top: 0;
        z-index: 80;
      }
      .logo {
        display: flex;
        align-items: center;
        min-height: 44px;
      }
      .logo img {
        display: block;
        width: auto;
        height: 42px;
        max-width: 170px;
        object-fit: contain;
      }
      .desktop-nav,
      .actions {
        display: flex;
        align-items: center;
        gap: 1.3rem;
      }
      .actions {
        margin-left: auto;
      }
      .cta {
        background: var(--teal);
        color: white !important;
        padding: 0.7rem 1rem;
        border-radius: var(--radius-sm);
      }
      a,
      button {
        color: var(--midnight);
        font-weight: 650;
        text-decoration: none;
        background: none;
        border: 0;
        font: inherit;
        cursor: pointer;
        transition:
          color var(--motion-fast) var(--ease-sureplace),
          background-color var(--motion-fast) var(--ease-sureplace),
          transform var(--motion-fast) var(--ease-sureplace);
      }
      .staff-header {
        gap: 1rem;
        padding-inline: clamp(1rem, 2.5vw, 2.5rem);
      }
      .console-label {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--teal);
        background: var(--mist);
        padding: 0.4rem 0.6rem;
        border-radius: 0.5rem;
        white-space: nowrap;
      }
      .staff-search {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex: 1;
        max-width: 460px;
        min-width: 120px;
        padding: 0.2rem 0.6rem;
        background: var(--mist);
        border: 1px solid var(--line);
        border-radius: 0.7rem;
        color: var(--slate);
      }
      .staff-search input {
        min-width: 0;
        width: 100%;
        border: 0;
        background: transparent;
        padding: 0.6rem 0;
        font: inherit;
        font-size: 0.85rem;
      }
      .staff-search button {
        min-width: 44px;
        min-height: 44px;
      }
      .staff-identity {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-left: auto;
        font-size: 0.85rem;
      }
      .staff-identity small {
        display: block;
        color: var(--slate);
        font-size: 0.7rem;
      }
      .staff-avatar {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        background: var(--mist);
        color: var(--teal);
        border-radius: 50%;
        font-weight: 800;
      }
      .exit-console {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 44px;
        font-size: 0.8rem;
        white-space: nowrap;
      }
      @media (max-width: 1100px) {
        .staff-search {
          display: none;
        }
      }
      @media (max-width: 850px) {
        .staff-identity {
          display: none;
        }
        .staff-header .exit-console {
          margin-left: auto;
        }
        .staff-header {
          gap: 0.6rem;
        }
      }
      @media (max-width: 560px) {
        .staff-header .logo img {
          max-width: 100px;
          height: auto;
        }
        .staff-header .exit-console span {
          display: none;
        }
        .staff-header .exit-console {
          width: 44px;
          justify-content: center;
        }
        .console-label {
          font-size: 0.65rem;
          padding: 0.3rem 0.4rem;
        }
      }
      .auth-placeholder {
        display: block;
        width: 7rem;
        height: 2rem;
        border-radius: 0.5rem;
        background: var(--mist);
      }
      .active {
        color: var(--teal);
      }
      .menu-button {
        display: none;
        margin-left: auto;
        width: 44px;
        height: 44px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        place-items: center;
        background: #fff;
        font-size: 1.2rem;
      }
      .mobile-shortcuts {
        display: none;
        margin-left: auto;
        align-items: center;
        gap: 0.35rem;
      }
      .mobile-shortcuts a {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        font-size: 1rem;
      }
      .menu-button:active,
      .cta:active {
        transform: scale(0.98);
      }
      .icon-button {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        padding: 0;
        font-size: 1.25rem;
      }
      .icon-button:hover,
      .icon-button:focus-visible {
        background: var(--mist);
        transform: scale(1.03);
      }
      .menu-button:focus-visible,
      .drawer a:focus-visible,
      .drawer button:focus-visible {
        outline: 3px solid color-mix(in srgb, var(--teal) 38%, transparent);
        outline-offset: 2px;
      }
      .backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: #152b2a99;
        opacity: 1;
        transition: opacity var(--motion-fast) var(--ease-sureplace);
      }
      .backdrop.is-closing {
        opacity: 0;
        pointer-events: none;
      }
      .drawer {
        position: fixed;
        z-index: 110;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(88vw, 390px);
        display: grid;
        grid-template-rows: auto 1fr;
        background: #fff;
        box-shadow: -20px 0 45px rgba(21, 43, 42, 0.18);
        padding: calc(0.65rem + env(safe-area-inset-top)) max(1.25rem, env(safe-area-inset-right))
          calc(0.75rem + env(safe-area-inset-bottom)) max(1.25rem, env(safe-area-inset-left));
        overflow: auto;
        transform: translateX(0);
        transition: transform var(--motion-drawer) var(--ease-sureplace);
        will-change: transform;
      }
      .drawer.is-closing {
        transform: translateX(100%);
      }
      .drawer-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        border-bottom: 1px solid var(--line);
        padding-bottom: 0.55rem;
      }
      .drawer-head .logo img {
        height: auto;
        width: 120px;
        max-width: 42vw;
      }
      .drawer nav {
        display: grid;
        gap: 1.25rem;
        padding-top: 0.7rem;
        align-content: start;
      }
      .drawer section {
        display: grid;
        gap: 0.12rem;
      }
      .section-children {
        min-height: 0;
        display: grid;
        gap: 0.12rem;
      }
      .accordion-panel {
        display: grid;
        grid-template-rows: 0fr;
        visibility: hidden;
        transition:
          grid-template-rows 200ms ease,
          visibility 200ms;
      }
      .accordion-panel.expanded {
        grid-template-rows: 1fr;
        visibility: visible;
      }
      .accordion-panel .section-children {
        overflow: hidden;
        padding-left: 0.85rem;
      }
      .drawer .accordion-panel a span {
        font-size: 0.92rem;
      }
      .drawer .accordion-toggle {
        width: 100%;
        font-weight: 750;
      }
      .drawer .accordion-toggle > span {
        flex: 1;
      }
      .drawer .accordion-toggle .chevron {
        width: 16px;
        font-size: 0.8rem;
        transition: transform 180ms ease;
      }
      .chevron.expanded {
        transform: rotate(90deg);
      }
      .drawer .context-active {
        color: var(--teal);
        background: color-mix(in srgb, var(--teal) 4%, white);
      }
      .drawer nav .logout-row {
        margin-top: 0.75rem;
        border-top: 1px solid var(--line);
        color: #955050;
      }
      .drawer {
        overscroll-behavior: contain;
      }
      .drawer h2 {
        margin: 0 0 0.45rem;
        color: var(--slate);
        font-size: 0.7rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 850;
      }
      .drawer a,
      .drawer nav button {
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        border-radius: 0.7rem;
        padding: 0.5rem 0.75rem;
        text-align: left;
        transition:
          background-color var(--motion-fast) var(--ease-sureplace),
          color var(--motion-fast) var(--ease-sureplace),
          box-shadow var(--motion-fast) var(--ease-sureplace),
          transform var(--motion-fast) var(--ease-sureplace);
      }
      .drawer-row {
        opacity: 0;
        transform: translateX(6px);
        animation: drawer-row-in 220ms var(--ease-sureplace) forwards;
      }
      .drawer.is-closing .drawer-row {
        animation: none;
        opacity: 1;
        transform: none;
      }
      .drawer a:hover,
      .drawer nav button:hover {
        background: var(--mist);
      }
      .drawer a:active,
      .drawer nav button:active {
        background: color-mix(in srgb, var(--teal) 10%, white);
        transform: scale(0.99);
      }
      .drawer a span,
      .drawer nav button span {
        display: flex;
        align-items: center;
        gap: 0.9rem;
        min-width: 0;
        font-size: 1rem;
      }
      .drawer a i,
      .drawer nav button i {
        width: 30px;
        text-align: center;
        color: var(--teal);
        font-size: 1.12rem;
      }
      .drawer a.current {
        background: color-mix(in srgb, var(--teal) 9%, white);
        color: var(--midnight);
        box-shadow: inset 4px 0 0 var(--teal);
        font-weight: 800;
      }
      .drawer a.primary-cta,
      .drawer a.secondary-cta {
        width: 100%;
        justify-content: center;
        margin-top: 0.45rem;
        font-weight: 850;
      }
      .drawer a.secondary-cta {
        background: color-mix(in srgb, var(--teal) 8%, white);
        border: 1px solid color-mix(in srgb, var(--teal) 42%, var(--line));
        color: var(--teal);
      }
      .drawer a.primary-cta {
        min-height: 54px;
        margin-top: 0.65rem;
        background: var(--teal);
        color: #fff;
      }
      .drawer a.primary-cta span,
      .drawer a.secondary-cta span {
        justify-content: center;
      }
      .drawer a.primary-cta i {
        color: #fff;
      }
      .drawer b {
        min-width: 1.45rem;
        text-align: center;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        font-size: 0.7rem;
        padding: 0.15rem 0.35rem;
      }
      @keyframes drawer-row-in {
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @media (max-width: 850px) {
        header {
          height: 72px;
          padding-inline: 1rem;
        }
        .desktop-nav,
        .actions {
          display: none;
        }
        .mobile-shortcuts {
          display: flex;
        }
        .menu-button {
          display: grid;
          margin-left: 0;
        }
        .logo img {
          height: 36px;
          max-width: 145px;
        }
      }
      @media (max-width: 340px) {
        .drawer {
          width: 90vw;
          padding-inline: 1rem;
        }
        .drawer a span,
        .drawer nav button span {
          gap: 0.75rem;
        }
        .drawer a i,
        .drawer nav button i {
          width: 28px;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        a,
        button,
        .backdrop,
        .accordion-panel,
        .chevron,
        .drawer,
        .drawer a,
        .drawer nav button {
          transition-duration: 0.01ms !important;
        }
        .drawer-row {
          animation: none;
          opacity: 1;
          transform: none;
        }
        .drawer,
        .drawer.is-closing {
          will-change: auto;
        }
        .icon-button:hover,
        .icon-button:focus-visible,
        .menu-button:active,
        .cta:active,
        .drawer a:active,
        .drawer nav button:active {
          transform: none;
        }
      }
    `,
  ],
})
export class PublicHeaderComponent {
  staffWorkspace = input(false);
  staffInitials = computed(
    () =>
      [this.auth.user()?.first_name, this.auth.user()?.last_name]
        .filter(Boolean)
        .map((name) => name![0])
        .join('')
        .slice(0, 2) || 'SP',
  );
  searchStaff(event: Event, search: string) {
    event.preventDefault();
    void this.router.navigate(['/staff/listings'], {
      queryParams: { search: search.trim(), status: '' },
    });
  }

  auth = inject(AuthService);
  agencyNavigation = inject(AgencyNavigationService);
  expandedSection = signal<SectionId | null>(null);
  config = inject(ConfigApiService);
  private router = inject(Router);
  private document = inject(DOCUMENT);
  private activity = inject(AccountActivityStore);
  private platformId = inject(PLATFORM_ID);
  menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  drawer = viewChild<ElementRef<HTMLElement>>('drawer');
  menuState = signal<MenuState>('closed');
  menuRendered = signal(false);
  menuExpanded = computed(() => this.menuState() === 'open');
  currentUrl = signal(this.router.url);
  private scrollY = 0;
  private scrollLocked = false;
  private returnFocusAfterClose = true;
  private previousAuthState = this.auth.isAuthenticated();
  hasSupplyAccess = computed(() =>
    (this.auth.user()?.onboarding_intents || []).some((intent) =>
      ['PROPERTY_AGENT', 'PROPERTY_OWNER'].includes(intent),
    ),
  );
  primaryCta = computed<NavItem>(() =>
    this.auth.isAuthenticated() && this.hasSupplyAccess()
      ? { label: 'Manage Listings', commands: '/account/manage' }
      : this.auth.isAuthenticated()
        ? { label: 'List a Property', commands: '/account/manage/properties/new' }
        : { label: 'List a Property', commands: '/account' },
  );
  mobileSections = computed<NavSection[]>(() =>
    this.auth.status() === 'initializing'
      ? [this.anonymousSections()[0]]
      : this.auth.isAuthenticated()
        ? this.authenticatedSections()
        : this.anonymousSections(),
  );

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.closeMenu(false);
      });
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
      {
        title: 'Explore',
        items: [
          { label: 'Home', commands: '/', icon: 'fa-solid fa-house' },
          {
            label: 'Properties',
            commands: '/properties',
            icon: 'fa-solid fa-building',
          },
          { label: 'Stays', commands: '/stays', feature: 'stays', icon: 'fa-solid fa-bed' },
          { label: 'Agents', commands: '/agents', icon: 'fa-solid fa-user-tie' },
        ],
      },
      {
        title: 'Account',
        items: [
          { label: 'Log in', commands: '/login', icon: 'fa-solid fa-right-to-bracket' },
          {
            label: 'Create account',
            commands: '/register',
            feature: 'registration',
            icon: 'fa-solid fa-user-plus',
            cta: 'secondary',
          },
          {
            label: 'List a Property',
            commands: '/account',
            icon: 'fa-solid fa-plus',
            cta: 'primary',
          },
        ],
      },
    ];
  }

  accountSections = computed(() =>
    accountNavigation({
      authenticated: this.auth.isAuthenticated(),
      staff: !!this.auth.user()?.is_staff,
      agencyLinks: this.agencyNavigation.links(),
      features: this.config.config().features,
    }),
  );
  badgeLabel = unreadBadgeLabel;

  authenticatedSections(): NavSection[] {
    const shared = this.accountSections();
    const sections: NavSection[] = [
      {
        title: 'Explore',
        items: [
          ...this.anonymousSections()[0].items,
          ...shared.flatMap((section) => section.items.filter((item) => item.mobileExplore)),
        ],
      },
      ...mobileAccountNavigation(shared),
    ];
    sections.push({
      title: '',
      items: [
        {
          label: 'List a Property',
          commands: '/account/manage/properties/new',
          icon: 'fa-solid fa-plus',
          cta: 'primary',
        },
        {
          label: 'Log out',
          commands: '#',
          action: 'logout',
          icon: 'fa-solid fa-right-from-bracket',
        },
      ],
    });
    return sections;
  }

  visible(items: NavItem[]) {
    return items.filter((item) => !item.feature || this.config.config().features[item.feature]);
  }

  badge(kind?: 'messages' | 'notifications') {
    const value =
      kind === 'messages'
        ? this.activity.unreadMessages()
        : kind === 'notifications'
          ? this.activity.unreadNotifications()
          : 0;
    return value > 99 ? '99+' : value ? String(value) : '';
  }

  drawerRowDelay(index: number) {
    return Math.min(index * 26, 180);
  }

  isPropertiesActive() {
    return this.currentUrl().startsWith('/properties');
  }

  currentSection(): SectionId | null {
    if (!this.auth.isAuthenticated()) return null;
    return mobileRouteSection(this.currentUrl(), this.accountSections());
  }

  toggleSection(id: SectionId) {
    this.expandedSection.update((current) => (current === id ? null : id));
  }

  openMenu() {
    if (!this.isBrowser()) return;
    if (this.menuState() !== 'closed') return;
    this.expandedSection.set(this.currentSection());
    this.agencyNavigation.refresh();
    this.menuRendered.set(true);
    this.menuState.set('open');
    this.lockScroll();
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.drawer()?.nativeElement.focus());
    }
  }

  closeMenu(returnFocus = true) {
    if (!this.menuRendered() || this.menuState() === 'closing') return;
    this.returnFocusAfterClose = returnFocus;
    this.menuState.set('closing');
    if (this.prefersReducedMotion()) this.completeClose();
  }

  finishClose(event: TransitionEvent) {
    if (
      this.menuState() !== 'closing' ||
      event.target !== this.drawer()?.nativeElement ||
      event.propertyName !== 'transform'
    ) {
      return;
    }
    this.completeClose();
  }

  logout() {
    this.closeMenu(false);
    this.auth.logout();
  }

  isActive(item: NavItem) {
    if (item.cta || typeof item.commands !== 'string') return false;
    return navigationActive(this.currentUrl(), { ...item, commands: item.commands });
  }

  trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const root = this.drawer()?.nativeElement;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((item) => !item.hasAttribute('disabled') && !item.closest('[inert]'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:keydown.escape')
  escape() {
    this.closeMenu();
  }

  private completeClose() {
    this.menuRendered.set(false);
    this.menuState.set('closed');
    this.unlockScroll();
    if (
      this.returnFocusAfterClose &&
      this.isBrowser() &&
      typeof requestAnimationFrame !== 'undefined'
    )
      requestAnimationFrame(() => this.menuButton()?.nativeElement.focus());
  }

  private lockScroll() {
    if (this.scrollLocked || !this.isBrowser()) return;
    const body = this.document.body;
    this.scrollY = window.scrollY || 0;
    body.style.position = 'fixed';
    body.style.top = `-${this.scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    this.scrollLocked = true;
  }

  private unlockScroll() {
    if (!this.scrollLocked || !this.isBrowser()) return;
    const body = this.document.body;
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    this.scrollLocked = false;
    if (this.scrollY) {
      try {
        window.scrollTo(0, this.scrollY);
      } catch {}
    }
  }

  private prefersReducedMotion() {
    return this.isBrowser() && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }
}
