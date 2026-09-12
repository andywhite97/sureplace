import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AccountNotification,
  BookingStatus,
  ViewingStatus,
} from '../../core/models/account.models';
import { NotificationNavigationService } from '../../core/services/notification-navigation.service';

@Component({
  selector: 'sp-stat-card',
  standalone: true,
  imports: [RouterLink],
  template: `<a [routerLink]="link()" class="stat">
    <span>{{ label() }}</span>
    <strong>{{ value() }}</strong>
  </a>`,
  styles: [
    `
      .stat {
        display: grid;
        gap: 0.35rem;
        padding: 1rem;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        text-decoration: none;
        color: var(--midnight);
        background: #fff;
      }
      .stat span {
        color: var(--slate);
        font-weight: 750;
      }
      .stat strong {
        font-size: 1.7rem;
      }
    `,
  ],
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<number>();
  link = input.required<string>();
}

@Component({
  selector: 'sp-status-badge',
  standalone: true,
  template: `<span [class]="tone()">{{ label() }}</span>`,
  styles: [
    `
      span {
        display: inline-flex;
        width: max-content;
        align-items: center;
        border-radius: 999px;
        padding: 0.2rem 0.55rem;
        font-size: 0.76rem;
        font-weight: 850;
        background: var(--mist);
        color: var(--slate);
      }
      .good {
        background: #e6f7ef;
        color: #17633b;
      }
      .warn {
        background: #fff4dd;
        color: #8a5a00;
      }
      .bad {
        background: #fde8e8;
        color: #9b2525;
      }
    `,
  ],
})
export class StatusBadgeComponent {
  status = input.required<BookingStatus | ViewingStatus>();
  label() {
    return this.status()
      .toLowerCase()
      .split('_')
      .map((x) => x[0].toUpperCase() + x.slice(1))
      .join(' ');
  }
  tone() {
    if (['CONFIRMED', 'COMPLETED'].includes(this.status())) return 'good';
    if (['DECLINED', 'CANCELLED', 'EXPIRED'].includes(this.status())) return 'bad';
    return 'warn';
  }
}

@Component({
  selector: 'sp-notification-item',
  standalone: true,
  imports: [DatePipe],
  template: `<article [class.unread]="!item().is_read">
    <span class="icon" aria-hidden="true">{{ icon() }}</span>
    <div>
      <strong>{{ item().title }}</strong>
      <p>{{ item().message }}</p>
      <time>{{ item().created_at | date: 'medium' }}</time>
    </div>
    <button type="button" (click)="open()">{{ actionLabel() }}</button>
  </article>`,
  styles: [
    `
      article {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 0.8rem;
        align-items: start;
        padding: 1rem;
        border-bottom: 1px solid var(--line);
      }
      .unread {
        background: #f1faf8;
      }
      .icon {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border-radius: 999px;
        background: var(--mist);
        font-weight: 900;
      }
      p {
        margin: 0.2rem 0;
        color: var(--slate);
      }
      time {
        font-size: 0.76rem;
        color: var(--slate);
      }
      button {
        border: 0;
        background: transparent;
        color: var(--teal);
        font-weight: 800;
        cursor: pointer;
      }
    `,
  ],
})
export class NotificationItemComponent {
  private navigation = inject(NotificationNavigationService);
  item = input.required<AccountNotification>();
  opened = output<AccountNotification>();
  icon() {
    const type = this.item().notification_type;
    if (type.includes('BOOKING')) return 'B';
    if (type.includes('VIEWING')) return 'V';
    if (type.includes('MESSAGE')) return 'M';
    if (type.includes('SEARCH')) return 'S';
    return '!';
  }
  actionLabel() {
    return this.navigation.label(this.item());
  }
  open() {
    this.navigation.open(this.item(), (updated) => this.opened.emit(updated));
  }
}
