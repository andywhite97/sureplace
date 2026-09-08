import { Component, HostListener, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { NotificationItemComponent, StatCardComponent } from './account-ui';

@Component({
  standalone: true,
  imports: [RouterLink, NotificationItemComponent, StatCardComponent],
  template: `<section class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">Account overview</p>
        <h1>Welcome back{{ auth.user()?.first_name ? ', ' + auth.user()?.first_name : '' }}</h1>
        <p>Your saved listings, alerts, bookings and messages are gathered here.</p>
      </div>
      @if (auth.user()?.avatar) {
        <img [src]="auth.user()!.avatar!" alt="" />
      }
    </header>
    @if (store.summary(); as s) {
      <div class="stats">
        <sp-stat-card label="Saved listings" [value]="store.savedTotal()" link="/account/saved" />
        <sp-stat-card label="Unread messages" [value]="store.unreadMessages()" link="/account/messages" />
        <sp-stat-card label="Active searches" [value]="s.active_saved_searches" link="/account/alerts" />
        <sp-stat-card label="Unread notifications" [value]="s.unread_notifications" link="/account/notifications" />
        <sp-stat-card label="Pending bookings" [value]="s.pending_bookings" link="/account/bookings" />
        <sp-stat-card label="Upcoming stays" [value]="s.upcoming_stays" link="/account/bookings" />
      </div>
    } @else {
      <div class="skeleton" aria-label="Loading overview"></div>
    }
    <section class="actions" aria-label="Quick actions">
      <a routerLink="/properties">Browse properties</a>
      <a routerLink="/stays">Browse stays</a>
      <a routerLink="/account/saved">Saved listings</a>
      <a routerLink="/account/alerts">Manage alerts</a>
    </section>
    <section class="activity">
      <h2>Recent activity</h2>
      @for (item of store.notifications(); track item.id) {
        <sp-notification-item [item]="item" />
      } @empty {
        <p class="empty">Recent account notifications will appear here.</p>
      }
    </section>
  </section>`,
  styles: [
    `.page{display:grid;gap:1.3rem}.hero{display:flex;justify-content:space-between;gap:1rem;align-items:center}.eyebrow{color:var(--teal);font-weight:850;text-transform:uppercase;font-size:.75rem}.hero h1{margin:.1rem 0}.hero p{color:var(--slate)}img{width:64px;height:64px;border-radius:999px;object-fit:cover}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.actions{display:flex;flex-wrap:wrap;gap:.6rem}.actions a{padding:.65rem .85rem;border-radius:var(--radius-sm);background:var(--teal);color:#fff;text-decoration:none;font-weight:800}.activity{border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden}.activity h2{margin:0;padding:1rem;border-bottom:1px solid var(--line)}.empty{padding:1rem;color:var(--slate)}.skeleton{height:170px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:760px){.stats{grid-template-columns:1fr}.hero{align-items:start}}`,
  ],
})
export class AccountOverviewComponent {
  auth = inject(AuthService);
  store = inject(AccountActivityStore);
  constructor() {
    this.store.refresh();
    this.store.startPolling();
  }
  @HostListener('document:visibilitychange') visible() {
    if (!document.hidden) this.store.refresh(true);
  }
}
