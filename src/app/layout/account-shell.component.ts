import { Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AgencyManagementApiService } from '../core/api/manage-api.services';
import { AccountActivityStore } from '../core/services/account-activity.store';
import { SeoService } from '../core/services/seo.service';

type AccountBadge = 'saved' | 'messages' | 'alerts' | 'bookings' | 'notifications';
type AccountLink = { label: string; path: string; badge?: AccountBadge; exact?: boolean };

@Component({
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `<main class="account">
    <aside>
      <h1>My SurePlace</h1>
      <nav aria-label="Account navigation">
        <p>My Account</p>
        @for (link of links; track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: link.exact ?? false }"
          >
            <span>{{ link.label }}</span>
            @if (badge(link.badge)) {
              <b>{{ badge(link.badge) }}</b>
            }
          </a>
        }
        <p>Manage Listings</p>
        @for (link of visibleManageLinks(); track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: link.exact ?? false }"
          >
            <span>{{ link.label }}</span>
            @if (badge(link.badge)) {
              <b>{{ badge(link.badge) }}</b>
            }
          </a>
        }
      </nav>
    </aside>
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
        background: white;
        padding: 1.25rem;
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        align-self: start;
      }
      h1 {
        font-size: 1.25rem;
      }
      nav {
        display: grid;
        gap: 0.2rem;
      }
      nav p {
        margin: 0.75rem 0 0.2rem;
        color: var(--slate);
        font-size: 0.72rem;
        text-transform: uppercase;
        font-weight: 900;
      }
      a {
        display: flex;
        justify-content: space-between;
        gap: 0.7rem;
        align-items: center;
        padding: 0.7rem;
        border-radius: var(--radius-sm);
        color: var(--slate);
        text-decoration: none;
      }
      .active {
        background: var(--mist);
        color: var(--teal);
        font-weight: 700;
      }
      b {
        min-width: 1.45rem;
        text-align: center;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        font-size: 0.7rem;
        padding: 0.15rem 0.35rem;
      }
      .content {
        min-width: 0;
        overflow-x: clip;
      }
      @media (max-width: 760px) {
        .account {
          display: block;
          width: min(100% - 1rem, 1380px);
          margin: 0.75rem auto 6rem;
        }
        aside {
          position: static;
          overflow: auto;
          margin-bottom: 1rem;
          padding: 0.7rem;
        }
        aside h1 {
          display: none;
        }
        nav {
          display: flex;
          width: max-content;
        }
        nav p {
          align-self: center;
          margin: 0 0.4rem;
        }
      }
    `,
  ],
})
export class AccountShellComponent {
  store = inject(AccountActivityStore);
  private seo = inject(SeoService);
  private destroy = inject(DestroyRef);
  private agencyApi = inject(AgencyManagementApiService);
  hasAgency = signal(false);
  links: AccountLink[] = [
    { label: 'Overview', path: '/account', exact: true },
    { label: 'Saved', path: '/account/saved', badge: 'saved' },
    { label: 'Messages', path: '/account/messages', badge: 'messages' },
    { label: 'Alerts', path: '/account/alerts', badge: 'alerts' },
    { label: 'Viewings', path: '/account/viewings' },
    { label: 'Bookings', path: '/account/bookings', badge: 'bookings' },
    { label: 'Notifications', path: '/account/notifications', badge: 'notifications' },
    { label: 'Profile', path: '/account/profile' },
    { label: 'Settings', path: '/account/settings' },
  ];
  manageLinks: AccountLink[] = [
    { label: 'Dashboard', path: '/account/manage', exact: true },
    { label: 'Create an agency', path: '/account/manage/agency/create', exact: true },
    { label: 'Agency', path: '/account/manage/agency', exact: true },
    { label: 'Team', path: '/account/manage/agency/team' },
    { label: 'Properties', path: '/account/manage/properties' },
    { label: 'Stays', path: '/account/manage/stays' },
    { label: 'Viewings', path: '/account/manage/viewings' },
    { label: 'Bookings', path: '/account/manage/bookings', badge: 'bookings' },
    { label: 'Verification', path: '/account/manage/verification' },
  ];

  constructor() {
    this.seo.privatePage(
      'My SurePlace',
      'Manage saved listings, messages, bookings and account settings.',
    );
    this.store.refresh();
    this.store.startPolling();
    this.agencyApi
      .mine()
      .pipe(catchError(() => of([])))
      .subscribe((agencies) => this.hasAgency.set(agencies.length > 0));
    this.destroy.onDestroy(() => this.store.stopPolling());
  }

  visibleManageLinks() {
    return this.manageLinks.filter((link) => {
      if (this.hasAgency()) return link.label !== 'Create an agency';
      return !['Agency', 'Team'].includes(link.label);
    });
  }

  badge(kind?: AccountBadge) {
    const s = this.store.summary();
    if (!kind || !s) return '';
    const n =
      kind === 'saved'
        ? this.store.savedTotal()
        : kind === 'messages'
          ? this.store.unreadMessages()
          : kind === 'alerts'
            ? s.active_saved_searches
            : kind === 'bookings'
              ? s.pending_bookings
              : kind === 'notifications'
                ? s.unread_notifications
                : 0;
    return n > 99 ? '99+' : n ? String(n) : '';
  }

  @HostListener('document:visibilitychange')
  visible() {
    if (!document.hidden) this.store.refresh(true);
  }
}
