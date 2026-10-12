import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { StaffStay, StayModerationAction } from '../../core/models/staff-stay.models';
import { ToastService } from '../../core/services/toast.service';
import { ListingMapComponent } from '../../shared/map/listing-map.component';
import { formatMoney } from '../../shared/listing/price-format';
import { StaffStayGalleryComponent } from './staff-stay-gallery.component';

export type StayReviewTab = 'overview' | 'rooms' | 'policies' | 'verification';
@Component({
  selector: 'sp-staff-stay-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ListingMapComponent, StaffStayGalleryComponent],
  templateUrl: './staff-stay-review.component.html',
  styleUrl: './staff-stay-review.component.scss',
})
export class StaffStayReviewComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  stay = input.required<StaffStay>();
  busy = input(false);
  error = input('');
  saved = input(0);
  tab = input<StayReviewTab>('overview');
  tabChanged = output<StayReviewTab>();
  action = output<{ action: StayModerationAction; reason: string }>();
  readonly tabs: StayReviewTab[] = ['overview', 'rooms', 'policies', 'verification'];
  readonly money = formatMoney;
  decision = signal<StayModerationAction | null>(null);
  reason = '';
  copyMessage = signal('');
  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('decisionDialog');
  coordinates = computed<[number, number] | null>(() => {
    const item = this.stay();
    return item.latitude !== null &&
      item.longitude !== null &&
      Number.isFinite(Number(item.latitude)) &&
      Number.isFinite(Number(item.longitude))
      ? [Number(item.latitude), Number(item.longitude)]
      : null;
  });
  markers = computed(() => {
    const point = this.coordinates();
    return point
      ? [
          {
            id: this.stay().id,
            latitude: point[0],
            longitude: point[1],
            label: 'Stay',
            title: this.stay().name,
          },
        ]
      : [];
  });
  mapUrl = computed(() => {
    const point = this.coordinates();
    return point
      ? `https://www.openstreetmap.org/?mlat=${point[0]}&mlon=${point[1]}#map=16/${point[0]}/${point[1]}`
      : null;
  });
  private previousId: string | null = null;
  private previousSaved = 0;
  constructor() {
    effect(() => {
      const id = this.stay().id,
        saved = this.saved();
      const changed =
        this.previousId !== null && (id !== this.previousId || saved !== this.previousSaved);
      this.previousId = id;
      this.previousSaved = saved;
      if (changed) {
        this.dialog().nativeElement.close();
        this.decision.set(null);
        this.reason = '';
      }
    });
  }
  can(permission: string) {
    const user = this.auth.user();
    return !!user?.is_superuser || (user?.staff_permissions ?? []).includes(permission);
  }
  permitted(action: StayModerationAction) {
    const key =
      (
        {
          'start-review': 'review',
          'request-changes': 'request_changes',
          notes: 'add_note',
        } as Partial<Record<StayModerationAction, string>>
      )[action] || action;
    return this.can(`stays.${key}_stay`);
  }
  available(action: StayModerationAction) {
    const status = this.stay().status;
    return (
      this.permitted(action) &&
      (action === 'notes' ||
        (action === 'start-review' && status === 'SUBMITTED') ||
        (['approve', 'request-changes'].includes(action) &&
          ['SUBMITTED', 'UNDER_REVIEW'].includes(status)) ||
        (action === 'reject' &&
          ['SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(status)) ||
        (action === 'suspend' && status === 'PUBLISHED') ||
        (action === 'restore' && status === 'SUSPENDED'))
    );
  }
  label(action: StayModerationAction | null) {
    return {
      approve: 'Approve stay',
      reject: 'Reject stay',
      'request-changes': 'Request changes',
      'start-review': 'Start review',
      suspend: 'Suspend stay',
      restore: 'Restore stay',
      notes: 'Add internal note',
    }[action || 'approve'];
  }
  needsReason() {
    return ['reject', 'request-changes', 'suspend', 'notes'].includes(this.decision() || '');
  }
  open(action: StayModerationAction) {
    if (!this.busy() && this.available(action)) {
      this.reason = '';
      this.decision.set(action);
      this.dialog().nativeElement.showModal();
    }
  }
  cancel(event?: Event) {
    if (this.busy()) {
      event?.preventDefault();
      return;
    }
    this.dialog().nativeElement.close();
    this.decision.set(null);
  }
  submit() {
    const action = this.decision();
    if (
      action &&
      !this.busy() &&
      this.available(action) &&
      (!this.needsReason() || this.reason.trim())
    )
      this.action.emit({ action, reason: this.reason.trim() });
  }
  tabKey(event: KeyboardEvent, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? 3
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + 4) % 4;
    this.tabChanged.emit(this.tabs[next]);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  async copyId() {
    try {
      await navigator.clipboard.writeText(this.stay().public_id);
      this.copyMessage.set('Listing ID copied');
      this.toast.show({ kind: 'success', title: 'Listing ID copied' });
    } catch {
      this.copyMessage.set('Copy unavailable. Select the listing ID to copy it.');
    }
  }
}
