import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ConfigApiService } from '../core/api/config-api.service';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';
import { AgencyNavigationService } from '../core/services/agency-navigation.service';
import {
  accountNavigation,
  desktopNavigation,
  navigationActive,
  unreadBadgeLabel,
  NavigationBadge,
} from '../core/services/account-navigation.config';
import { SeoService } from '../core/services/seo.service';

@Component({
  standalone: true,
  imports: [RouterLink, RouterOutlet],
  template: `<main class="account">
    @if (auth.isAuthenticated()) {
      <aside>
        <h1>My SurePlace</h1>
        @if (auth.user()?.first_name; as name) {
          <p class="user-summary">
            <i class="fa-solid fa-circle-user" aria-hidden="true"></i><span>{{ name }}</span>
          </p>
        }
        <nav aria-label="Account navigation">
          @for (section of sections(); track section.id) {
            <section
              [class.staff-switch]="section.id === 'staff'"
              [attr.aria-labelledby]="'account-heading-' + section.id"
            >
              <h2 [id]="'account-heading-' + section.id">{{ section.title }}</h2>
              @for (link of section.items; track link.commands) {
                <a
                  [routerLink]="link.commands"
                  [class.active]="isActive(currentUrl(), link)"
                  [attr.aria-current]="isActive(currentUrl(), link) ? 'page' : null"
                >
                  <i [class]="link.icon" aria-hidden="true"></i><span>{{ link.label }}</span>
                  @if (badge(link.badge); as count) {
                    <b [attr.aria-label]="badgeLabel(link.badge, count)">{{ count }}</b>
                  }
                </a>
              }
            </section>
          }
        </nav>
      </aside>
    }
    <section class="content"><router-outlet /></section>
  </main>`,
  styles: [
    `
      .account {
        width: min(1380px, calc(100% - 2rem));
        margin: 1.25rem auto 2rem;
        display: grid;
        grid-template-columns: 230px minmax(0, 1fr);
        gap: 1.5rem;
      }
      aside {
        position: sticky;
        top: calc(var(--app-header-height, 72px) + 1rem);
        max-height: calc(100dvh - var(--app-header-height, 72px) - 2rem);
        overflow-y: auto;
        overscroll-behavior: contain;
        background: white;
        padding: 1rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        align-self: start;
      }
      h1 {
        font-size: 1.25rem;
        margin: 0 0 0.65rem;
      }
      .user-summary {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin: 0 0 0.5rem;
        color: var(--slate);
        font-size: 0.9rem;
      }
      .user-summary span {
        overflow-wrap: anywhere;
      }
      nav,
      nav section {
        display: grid;
        gap: 0.15rem;
      }
      h2 {
        margin: 1.2rem 0.55rem 0.35rem;
        color: var(--slate);
        font-size: 0.68rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 800;
      }
      a {
        display: flex;
        gap: 0.6rem;
        align-items: center;
        min-height: 44px;
        padding: 0.55rem;
        border-radius: var(--radius-sm);
        color: var(--slate);
        text-decoration: none;
        font-size: 0.88rem;
      }
      a span {
        flex: 1;
        min-width: 0;
      }
      a i {
        width: 1.1rem;
        flex: 0 0 1.1rem;
        text-align: center;
        opacity: 0.8;
      }
      a:hover {
        background: var(--mist);
      }
      a:focus-visible {
        outline: 3px solid var(--teal);
        outline-offset: 2px;
      }
      a.active {
        background: var(--mist);
        color: var(--teal);
        font-weight: 750;
        box-shadow: inset 3px 0 var(--teal);
      }
      b {
        min-width: 1.35rem;
        text-align: center;
        border-radius: 999px;
        background: var(--teal);
        color: white;
        font-size: 0.68rem;
        padding: 0.15rem 0.3rem;
      }
      .staff-switch {
        border-top: 1px solid var(--line);
        margin-top: 1rem;
      }
      .content {
        min-width: 0;
        overflow-x: clip;
      }
      @media (max-width: 850px) {
        .account {
          display: block;
          width: min(100% - 1rem, 1380px);
          margin: 0.75rem auto 6rem;
        }
        aside {
          display: none;
        }
      }
    `,
  ],
})
export class AccountShellComponent {
  auth = inject(AuthService);
  store = inject(AccountActivityStore);
  private config = inject(ConfigApiService);
  private agency = inject(AgencyNavigationService);
  private seo = inject(SeoService);
  private destroy = inject(DestroyRef);
  private router = inject(Router);
  currentUrl = signal(this.router.url);
  sections = computed(() =>
    desktopNavigation(
      accountNavigation({
        authenticated: this.auth.isAuthenticated(),
        staff: !!this.auth.user()?.is_staff,
        agencyLinks: this.agency.links(),
        features: this.config.config().features,
      }),
    ),
  );
  isActive = navigationActive;
  badgeLabel = unreadBadgeLabel;
  constructor() {
    this.seo.privatePage(
      'My SurePlace',
      'Manage saved listings, messages, bookings and account settings.',
    );
    this.store.refresh();
    this.store.startPolling();
    this.agency.refresh();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
    this.destroy.onDestroy(() => this.store.stopPolling());
  }
  badge(kind?: NavigationBadge) {
    const value =
      kind === 'messages'
        ? this.store.unreadMessages()
        : kind === 'notifications'
          ? this.store.unreadNotifications()
          : 0;
    return value > 99 ? '99+' : value ? String(value) : '';
  }
  @HostListener('document:visibilitychange')
  visible() {
    if (!document.hidden) this.store.refresh(true);
  }
}
