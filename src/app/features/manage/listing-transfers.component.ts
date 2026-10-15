import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';

interface Transfer {
  id: string; kind: string; listing_id: string; listing_title: string;
  sender: string; recipient: string; status: string; expires_at: string;
  can_receive: boolean; can_cancel: boolean;
}
interface Listing { id: string; kind: string; title: string; public_id: string; }
interface Options { listings: Listing[]; agencies: { id: string; name: string }[]; }

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `<section class="transfers">
    <header><h1>Listing transfers</h1><p>Transfer a property or stay to another user or agency. The recipient must accept within 7 days.</p></header>
    @if (error()) { <p role="alert">{{ error() }}</p> }
    @if (notice()) { <p role="status">{{ notice() }}</p> }
    @if (loading()) { <p role="status">Loading transfers…</p> }
    <button type="button" [disabled]="busy() || loading()" (click)="load()">Refresh</button>
    @if (options(); as choices) {
      @if (choices.listings.length) {
        <form (ngSubmit)="send()">
          <h2>Send a transfer request</h2>
          <label>Listing<select name="listing" [(ngModel)]="listingKey" required><option value="">Choose a listing</option>
            @for (item of choices.listings; track item.kind + item.id) { <option [value]="item.kind + ':' + item.id">{{ item.title }} · {{ item.public_id }}</option> }
          </select></label>
          <label>Transfer to<select name="target" [(ngModel)]="target"><option value="user">A user</option><option value="agency">An agency</option></select></label>
          @if (target === 'user') {
            <label>Recipient email<input type="email" name="email" [(ngModel)]="email" required autocomplete="email" /></label>
            <p>The recipient needs an active SurePlace account.</p>
          } @else {
            <label>Receiving agency<select name="agency" [(ngModel)]="agencyId" required><option value="">Choose an agency</option>
              @for (agency of choices.agencies; track agency.id) { <option [value]="agency.id">{{ agency.name }}</option> }
            </select></label>
            <p>An active owner or admin of this agency must accept.</p>
          }
          <p>After acceptance, management access moves to the recipient and listing verification resets. The listing keeps its public link, images and booking records. Publication limits still apply; listings with paid allowance history may require support.</p>
          <label class="ack"><input type="checkbox" name="ack" [(ngModel)]="acknowledged" required /> I understand that I may lose access when this transfer is accepted.</label>
          <button type="submit" [disabled]="busy() || !acknowledged || !listingKey || (target === 'user' ? !email : !agencyId)">Send transfer request</button>
        </form>
      } @else { <p>You can transfer listings you own individually or manage as an agency owner/admin.</p> }
    }
    <h2>Received and sent requests</h2>
    @for (item of transfers(); track item.id) {
      <article><h3>{{ item.listing_title }}</h3><p>{{ item.sender }} → {{ item.recipient }}</p><p>{{ item.status }} · Expires {{ item.expires_at | date:'medium' }}</p>
        @if (item.status === 'PENDING') {
          @if (item.can_receive) {
            <p>Accepting gives you responsibility for this listing and any existing bookings.</p>
            @if (confirmId() === item.id) {
              <p>Confirm that you want to take ownership of this listing.</p>
              <button [disabled]="busy()" (click)="resolve(item, 'accept')">Confirm acceptance</button>
              <button [disabled]="busy()" (click)="confirmId.set(null)">Go back</button>
            } @else { <button [disabled]="busy()" (click)="confirmId.set(item.id)">Accept transfer</button> }
            <button [disabled]="busy()" (click)="resolve(item, 'decline')">Decline</button>
          }
          @if (item.can_cancel) { <button [disabled]="busy()" (click)="resolve(item, 'cancel')">Cancel request</button> }
        }
      </article>
    } @empty { @if (!loading()) { <p>No transfer requests yet.</p> } }
    <nav><a routerLink="/account/manage/properties">Manage properties</a> · <a routerLink="/account/manage/stays">Manage stays</a></nav>
  </section>`,
  styles: [`
    .transfers{display:grid;gap:1rem;max-width:850px}header p,p{color:var(--slate)}
    form,article{display:grid;gap:.85rem;padding:1.25rem;border:1px solid var(--line);border-radius:1rem;background:var(--surface,#fff)}
    h1,h2,h3,p{margin:0}label{display:grid;gap:.4rem;font-weight:650}input,select,button{font:inherit;padding:.75rem;border:1px solid var(--line);border-radius:.5rem;max-width:100%;box-sizing:border-box}
    button{background:var(--teal);color:white;cursor:pointer}button:disabled{opacity:.55;cursor:default}.ack{display:flex;align-items:start}.ack input{margin-top:.3rem}a{color:var(--teal)}[role=alert]{color:#a52b2b}
  `],
})
export class ListingTransfersComponent {
  private api = inject(ApiClient);
  private route = inject(ActivatedRoute);
  transfers = signal<Transfer[]>([]);
  options = signal<Options | null>(null);
  loading = signal(false);
  busy = signal(false);
  error = signal('');
  notice = signal('');
  confirmId = signal<string | null>(null);
  listingKey = '';
  target = 'user';
  email = '';
  agencyId = '';
  acknowledged = false;

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('kind') && params.get('listing')) this.listingKey = `${params.get('kind')}:${params.get('listing')}`;
    this.load();
  }
  load() {
    this.error.set('');
    this.loading.set(true);
    this.api.get<Transfer[]>('/listing-transfers/').pipe(finalize(() => this.loading.set(false))).subscribe({
      next: items => this.transfers.set(items), error: err => this.showError(err),
    });
    this.api.get<Options>('/listing-transfers/options/').subscribe({ next: options => this.options.set(options), error: err => this.showError(err) });
  }
  send() {
    if (this.busy() || !this.acknowledged) return;
    const [kind, listing_id] = this.listingKey.split(':');
    this.busy.set(true); this.error.set(''); this.notice.set('');
    this.api.post<Transfer>('/listing-transfers/', { kind, listing_id, ...(this.target === 'user' ? { email: this.email.trim() } : { agency_id: this.agencyId }) })
      .pipe(finalize(() => this.busy.set(false))).subscribe({
        next: () => { this.acknowledged = false; this.notice.set('Transfer request sent. Ownership changes after acceptance.'); this.load(); },
        error: err => this.showError(err),
      });
  }
  resolve(item: Transfer, action: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    this.api.post<Transfer>(`/listing-transfers/${encodeURIComponent(item.id)}/`, { action }).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => { this.confirmId.set(null); this.notice.set(action === 'accept' ? 'Transfer accepted. You can now manage this listing.' : 'Transfer request updated.'); this.load(); },
      error: err => this.showError(err),
    });
  }
  private showError(err: { error?: unknown }) {
    const body = err.error;
    this.error.set(typeof body === 'string' ? body : body ? JSON.stringify(body) : 'Unable to complete this request. Please try again.');
  }
}
