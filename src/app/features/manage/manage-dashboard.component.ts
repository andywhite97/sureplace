import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import {
  ManagerBookingsApiService,
  ManagerViewingsApiService,
  PropertyManagementApiService,
  StayManagementApiService,
} from '../../core/api/manage-api.services';
import { MessagingApiService } from '../../core/api/messaging-api.service';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { AccountNotification } from '../../core/models/account.models';
import { NotificationItemComponent, StatCardComponent } from '../account/account-ui';

@Component({
  standalone: true,
  imports: [RouterLink, StatCardComponent, NotificationItemComponent],
  template: `<section class="page">
    <header>
      <p class="eyebrow">Manage Listings</p>
      <h1>Supply dashboard</h1>
      <p>Track your properties, stays, requests and guest conversations.</p>
    </header>
    @if (loading()) {
      <div class="skeleton"></div>
    } @else {
      <div class="stats">
        <sp-stat-card
          label="Active properties"
          [value]="activeProperties()"
          link="/account/manage/properties"
        />
        <sp-stat-card
          label="Draft properties"
          [value]="draftProperties()"
          link="/account/manage/properties"
        />
        <sp-stat-card label="Active stays" [value]="activeStays()" link="/account/manage/stays" />
        <sp-stat-card
          label="Pending viewings"
          [value]="pendingViewings()"
          link="/account/manage/viewings"
        />
        <sp-stat-card
          label="Pending bookings"
          [value]="pendingBookings()"
          link="/account/manage/bookings"
        />
        <sp-stat-card label="Unread messages" [value]="unreadMessages()" link="/account/messages" />
      </div>
    }
    <nav class="actions" aria-label="Portfolio quick actions">
      <a routerLink="/account/manage/listings/new">Add Listing</a
      ><a routerLink="/account/messages">View Messages</a
      ><a routerLink="/account/manage/bookings">Manage Bookings</a>
    </nav>
    <section class="activity">
      <h2>Recent operational activity</h2>
      @for (n of notifications(); track n.id) {
        <sp-notification-item [item]="n" />
      } @empty {
        <p>Operational notifications will appear here.</p>
      }
    </section>
  </section>`,
  styles: [
    `
      .page {
        display: grid;
        gap: 1.2rem;
      }
      .eyebrow {
        color: var(--teal);
        font-weight: 850;
        text-transform: uppercase;
        font-size: 0.75rem;
      }
      h1,
      p {
        margin: 0.1rem 0;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.8rem;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .actions a {
        padding: 0.65rem 0.85rem;
        border-radius: var(--radius-sm);
        background: var(--teal);
        color: #fff;
        text-decoration: none;
        font-weight: 850;
      }
      .activity {
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
      .activity h2 {
        margin: 0;
        padding: 1rem;
        border-bottom: 1px solid var(--line);
      }
      .activity p {
        padding: 1rem;
        color: var(--slate);
      }
      .skeleton {
        height: 180px;
        background: var(--mist);
        border-radius: var(--radius-sm);
      }
      @media (max-width: 760px) {
        .stats {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ManageDashboardComponent {
  private properties = inject(PropertyManagementApiService);
  private stays = inject(StayManagementApiService);
  private viewings = inject(ManagerViewingsApiService);
  private bookings = inject(ManagerBookingsApiService);
  private messages = inject(MessagingApiService);
  private notificationsApi = inject(NotificationsApiService);
  loading = signal(true);
  propertyRows = signal<{ status: string }[]>([]);
  stayRows = signal<{ status: string }[]>([]);
  viewingRows = signal<{ status: string }[]>([]);
  bookingRows = signal<{ status: string }[]>([]);
  unreadMessages = signal(0);
  notifications = signal<AccountNotification[]>([]);
  activeProperties = computed(
    () => this.propertyRows().filter((x) => x.status === 'PUBLISHED').length,
  );
  draftProperties = computed(() => this.propertyRows().filter((x) => x.status === 'DRAFT').length);
  activeStays = computed(() => this.stayRows().filter((x) => x.status === 'PUBLISHED').length);
  pendingViewings = computed(() => this.viewingRows().filter((x) => x.status === 'PENDING').length);
  pendingBookings = computed(() => this.bookingRows().filter((x) => x.status === 'PENDING').length);
  constructor() {
    forkJoin({
      p: this.properties.mine(),
      s: this.stays.mine(),
      v: this.viewings.list(),
      b: this.bookings.list(),
      m: this.messages.list(),
      n: this.notificationsApi.list(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe(({ p, s, v, b, m, n }) => {
        this.propertyRows.set(p.results);
        this.stayRows.set(s.results);
        this.viewingRows.set(v.results);
        this.bookingRows.set(b.results);
        this.unreadMessages.set(m.results.reduce((total, c) => total + c.unread_count, 0));
        this.notifications.set(n.results.slice(0, 5));
      });
  }
}
