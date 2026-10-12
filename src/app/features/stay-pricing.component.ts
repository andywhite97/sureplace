import { Component, inject, signal } from '@angular/core';
import { StayEntitlementsApiService, StayPricing } from '../core/api/stay-entitlements-api.service';
import { ListingEntryService } from '../core/services/listing-entry.service';

@Component({
  selector: 'sp-stay-pricing', standalone: true,
  template: `
    <section class="stay-pricing" aria-label="Stay listing pricing">
      <header><p class="eyebrow">STAYS & ACCOMMODATION</p>
        <h1>List your stay for free. Grow your hospitality business.</h1>
        <p>Welcome more guests with SurePlace. Create your accommodation listings for free and upgrade when your business grows.</p>
      </header>
      @if (error()) { <p role="alert">Stay pricing could not be loaded. <button type="button" (click)="load()">Try again</button></p> }
      @else if (!pricing()) { <p role="status">Loading hosting plans…</p> }
      @if (pricing(); as data) {
        <div class="plans">@for (plan of data.plans; track plan.code) {
          <article [class.prominent]="plan.code === 'HOST_FREE'">
            <span class="label">{{ plan.billing_interval === 'FOREVER' ? 'Free hosting plan' : 'Monthly hosting plan' }}</span>
            <h2>{{ plan.display_name }}</h2>
            <p class="price">{{ money(plan.price, data.currency_symbol) }} <small>{{ plan.billing_interval === 'FOREVER' ? 'forever' : '/month' }}</small></p>
            <strong>{{ plan.active_listing_limit }} active stays</strong>
            <p>One stay is one accommodation establishment. Your room types and room units do not consume extra listing slots.</p>
            @if (plan.billing_interval === 'FOREVER') { <button type="button" (click)="list()">List your stay for free</button> }
            @else { <p class="coming">Paid checkout coming soon · Administrator-managed grants available</p> }
          </article>
        }</div>
        <section class="comparison"><h2>Compare hosting plans</h2>
          <table><caption>Base listing allowances replace the free allowance. They are not added to it.</caption>
            <thead><tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">Active stays</th></tr></thead>
            <tbody>@for (plan of data.plans; track plan.code) { <tr><th scope="row">{{ plan.display_name }}</th><td>{{ money(plan.price, data.currency_symbol) }} {{ plan.billing_interval === 'FOREVER' ? 'forever' : '/month' }}</td><td>{{ plan.active_listing_limit }}</td></tr> }</tbody>
          </table>
          <h3>Essential features in every plan</h3><ul>@for (feature of data.features; track feature) { <li><i class="fa-solid fa-check" aria-hidden="true"></i> {{ feature }}</li> }</ul>
          <p>{{ data.booking_commission_percent }}% booking commission in this phase. No limit on room types or room units is imposed by these plans.</p>
        </section>
        <section id="extra-stays"><h2>Need room to grow?</h2>
          <p>Managing more accommodation properties? Add extra stay listings without committing to a monthly subscription.</p>
          <div class="addons">@for (addon of data.addons; track addon.code) {
            <article><span class="label">One-time purchase</span><h3>{{ addon.display_name }}</h3>
              <p class="price">{{ money(addon.price, data.currency_symbol) }}</p>
              <strong>{{ addon.duration_days }} days per activated listing</strong>
              <p>{{ addon.quantity }} additional stay {{ addon.quantity === 1 ? 'allowance' : 'allowances' }}. Unused units wait until assigned, subject to any purchase-validity policy specified with your grant.</p>
              <p class="coming">Checkout coming soon</p></article>
          }</div><p>Extra stay slots add accommodation listings, not rooms inside an accommodation property. No automatic renewal.</p>
        </section>
        <section class="promotions"><h2>Promotions · coming soon</h2>
          @for (promotion of data.promotions; track promotion.code) {
            <article><h3>{{ promotion.display_name }}</h3><p class="price">{{ money(promotion.price, data.currency_symbol) }} <small>/ {{ promotion.duration_days }} days</small></p><p>{{ promotion.description }}</p><p>Boosting and checkout are not available in this phase.</p></article>
          }
        </section>
        <section class="faq"><h2>Hosting questions, answered</h2>
          @for (item of faqs; track item.question) { <details><summary>{{ item.question }}</summary><p>{{ item.answer }}</p></details> }
        </section>
      }
    </section>`,
  styles: [`
    :host{display:block;min-width:0}.stay-pricing{max-width:1160px;margin:auto;padding:2rem 1rem;display:grid;gap:2rem;color:var(--midnight)}header{max-width:800px}
    h1{font-size:clamp(1.8rem,4vw,2.8rem);line-height:1.15;margin:.5rem 0 1rem}h2{font-size:1.35rem}p{color:var(--slate);line-height:1.6}.eyebrow,.label{color:var(--teal);font-weight:800;font-size:.8rem}
    .plans{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem}article{border:1px solid var(--line);border-radius:1rem;padding:1.25rem;display:flex;flex-direction:column;background:var(--surface,#fff);min-width:0}.prominent{border:2px solid var(--teal)}
    .price{font-size:1.9rem;font-weight:850;color:var(--midnight);margin:.6rem 0}small{font-size:.85rem;font-weight:500}.coming{font-size:.85rem;margin-top:auto;padding-top:1rem}
    button{padding:.75rem;border:1px solid var(--teal);border-radius:.55rem;background:var(--teal);color:#fff;font:inherit;font-weight:750;cursor:pointer;min-height:44px;box-sizing:border-box}article button{margin-top:auto}
    .comparison{background:var(--surface,#fff);border:1px solid var(--line);border-radius:1rem;padding:1.5rem}table{width:100%;border-collapse:collapse;table-layout:fixed}caption{text-align:left;color:var(--slate);padding-bottom:1rem}th,td{text-align:left;padding:.75rem .35rem;border-bottom:1px solid var(--line);overflow-wrap:anywhere}th:first-child{width:40%}th:nth-child(2){width:35%}
    .comparison ul{padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.8rem}i{color:var(--teal)}.addons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}.promotions article{max-width:600px}
    details{padding:1rem 0;border-bottom:1px solid var(--line)}summary{font-weight:750;cursor:pointer;min-height:32px}details p{max-width:800px}
    @media(max-width:900px){.plans{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.plans,.addons{grid-template-columns:1fr}.stay-pricing{padding:1.5rem .25rem}.comparison{padding:1rem}table{font-size:.85rem}th,td{padding:.65rem .25rem}}
  `],
})
export class StayPricingComponent {
  private api = inject(StayEntitlementsApiService);
  private entry = inject(ListingEntryService);
  pricing = signal<StayPricing | null>(null);
  error = signal(false);
  faqs = [
    { question: 'Are stay listings free?', answer: 'Yes. Host Free has no upfront listing fee and retains the existing core hosting tools, including rooms, calendars, pricing, enquiries, booking management and verification.' },
    { question: 'Do room types count separately?', answer: 'No. One accommodation establishment counts as one stay. Room types, room units and availability records do not consume listing slots. A published stay still counts when it is sold out for selected dates.' },
    { question: 'What happens when all free slots are used?', answer: 'You can keep editing your listings and saving drafts. Additional publication needs available plan capacity or a valid extra allowance granted to your account. Compare hosting plans or manage existing listings.' },
    { question: 'Can I purchase additional listings?', answer: 'One-time extra allowances are available through documented administrator-managed grants. Online checkout is coming soon. Each unit starts its term when assigned and does not renew automatically.' },
    { question: 'What happens when an extra listing expires?', answer: 'It may continue within ordinary plan capacity. If capacity is full, pending or current/future confirmed reservations protect the stay while renewal or administrator review is arranged. Otherwise that specific stay may be paused safely, with its rooms, calendars and history preserved.' },
    { question: 'What happens to existing bookings?', answer: 'Entitlement expiry never cancels or edits reservations, price snapshots, inventory or conversations. Pending holds retain their existing expiry rules. Booking workflows continue for a protected over-limit stay.' },
    { question: 'Are there booking commissions?', answer: 'Booking commission is 0% in this phase.' },
    { question: 'Can I upgrade later?', answer: 'Yes. Administrators can grant a paid hosting plan with a documented reason. Paid plans replace the free base allowance. Paid checkout and automatic renewal are not enabled.' },
  ];
  constructor() { this.load(); }
  load() { this.error.set(false); this.api.pricing().subscribe({ next: value => this.pricing.set(value), error: () => this.error.set(true) }); }
  money(price: string, symbol: string) { return `${symbol}${price.replace(/\.00$/, '')}`; }
  list() { void this.entry.startStayListing(); }
}
