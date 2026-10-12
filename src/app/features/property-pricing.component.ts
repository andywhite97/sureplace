import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PropertyEntitlementsApiService, PropertyPricing } from '../core/api/property-entitlements-api.service';
import { ListingEntryService } from '../core/services/listing-entry.service';

@Component({
  selector: 'sp-property-pricing', standalone: true, imports: [RouterLink],
  template: `
    <section class="property-pricing">
      <header><p class="eyebrow">PROPERTY LISTINGS</p><h1>Start listing for free. Grow at your own pace.</h1>
        <p>Advertise your properties on SurePlace without upfront listing fees. Upgrade when you need more.</p></header>
      @if (error()) { <p role="alert">Pricing could not be loaded. <button (click)="load()">Try again</button></p> }
      @else if (!pricing()) { <p role="status">Loading property plans…</p> }
      @if (pricing(); as data) {
        <div class="plans">
          @for (plan of data.plans; track plan.code) {
            <article [class.prominent]="plan.code === 'AGENCY_FREE'">
              <span class="label">{{ plan.billing_interval === 'FOREVER' ? 'Free plan' : 'Monthly plan' }}</span>
              <h2>{{ plan.display_name }}</h2>
              <p class="price">{{ money(plan.price, data.currency_symbol) }} <small>{{ plan.billing_interval === 'FOREVER' ? 'forever' : '/month' }}</small></p>
              <strong>{{ plan.active_listing_limit }} active listings</strong>
              <p>{{ plan.applicable_account_types.join(' & ').toLowerCase() }} accounts</p>
              @if (plan.billing_interval === 'FOREVER') {
                @if (plan.code === 'AGENCY_FREE') { <a routerLink="/account/manage/agency">Manage your agency</a> }
                @else { <button (click)="list()">Start listing for free</button> }
              } @else { <p class="coming">Paid checkout coming soon</p> }
            </article>
          }
        </div>
        <section class="comparison"><h2>Included in every plan</h2><ul>
          @for (feature of data.features; track feature) { <li><i class="fa-solid fa-check" aria-hidden="true"></i> {{ feature }}</li> }
        </ul><p>Paid plans replace your base allowance. They do not stack on top of free plans.</p>
          <p>{{ data.property_sales_commission_percent }}% property sales commissions.</p></section>
        <section id="extra-listings"><h2>Need just one more listing?</h2><p>One-time purchases. No recurring payments or automatic renewal.</p>
          <div class="addons">@for (addon of data.addons; track addon.code) {
            <article><h3>{{ addon.display_name }}</h3><p class="price">{{ money(addon.price, data.currency_symbol) }} <small>/ {{ addon.duration_days }} days</small></p>
              <p>{{ addon.quantity }} extra listing {{ addon.quantity === 1 ? 'allowance' : 'allowances' }}. Each begins when activated.</p>
              <p class="coming">Checkout coming soon · Administrator-managed grants available</p></article>
          }</div><p>Unused bundle allowances wait until activated, subject to any purchase-validity policy shown when granted.</p></section>
        <section class="faq"><h2>Your questions, answered</h2>
          @for (item of faqs; track item.question) { <details><summary>{{ item.question }}</summary><p>{{ item.answer }}</p></details> }
        </section>
      }
    </section>`,
  styles: [`
    :host{display:block;min-width:0}.property-pricing{max-width:1160px;margin:auto;padding:2rem 1rem;display:grid;gap:2rem;color:var(--midnight)}
    header{max-width:760px}h1{font-size:clamp(1.8rem,4vw,2.8rem);line-height:1.15;margin:.5rem 0 1rem}h2{font-size:1.35rem}p{color:var(--slate);line-height:1.6}.eyebrow,.label{color:var(--teal);font-weight:800;font-size:.8rem}
    .plans{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:1rem}article{border:1px solid var(--line);border-radius:1rem;padding:1.25rem;display:flex;flex-direction:column;background:var(--surface,#fff);min-width:0}.prominent{border:2px solid var(--teal)}
    .price{color:var(--midnight);font-weight:850;font-size:1.9rem;margin:.6rem 0}small{font-size:.85rem;font-weight:500}.coming{font-size:.85rem;margin-top:auto;padding-top:1rem}
    button,a{padding:.75rem;border:1px solid var(--teal);border-radius:.55rem;background:var(--teal);color:#fff;font:inherit;font-weight:750;cursor:pointer;text-align:center;text-decoration:none;min-height:44px;box-sizing:border-box}article a,article button{margin-top:auto}
    .comparison{background:var(--surface,#fff);border:1px solid var(--line);padding:1.5rem;border-radius:1rem}.comparison ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));padding:0;gap:.8rem;list-style:none}i{color:var(--teal)}.addons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1rem}
    details{padding:1rem 0;border-bottom:1px solid var(--line)}summary{font-weight:750;cursor:pointer;min-height:32px}details p{max-width:800px}
    @media(max-width:600px){.plans,.addons{grid-template-columns:1fr}.property-pricing{padding:1.5rem .25rem}article{padding:1.25rem}}
  `],
})
export class PropertyPricingComponent {
  private api = inject(PropertyEntitlementsApiService);
  private entry = inject(ListingEntryService);
  pricing = signal<PropertyPricing | null>(null);
  error = signal(false);
  faqs = [
    { question: 'Are free listings really free?', answer: 'Yes. Free property plans have no upfront listing fee and include the core listing, photo, verification, enquiry and viewing tools.' },
    { question: 'What counts as an active listing?', answer: 'A published property marked available in public inventory consumes a slot. Drafts, review-stage listings, paused, expired, suspended and unavailable properties do not. Sold or rented properties should be marked unavailable.' },
    { question: 'Can I add more than five agency listings?', answer: 'Yes. Upgrade the agency plan or use a one-time extra allowance. Every agent shares the agency’s allowance. Personal listings use a separate individual allowance.' },
    { question: 'Do extra listings renew automatically?', answer: 'No. Each extra allowance is a one-time purchase and does not renew automatically.' },
    { question: 'What happens when an extra listing expires?', answer: 'After its activation period, the property may continue within ordinary plan capacity. Otherwise that property is paused; its photos, messages and history remain. Contact an administrator to arrange renewal and resubmit it for review.' },
    { question: 'Can I upgrade later?', answer: 'Yes. Paid prices are shown here; checkout is coming soon. Administrators can arrange documented plan and extra-listing grants in the meantime.' },
    { question: 'Does SurePlace charge property sales commissions?', answer: 'SurePlace charges 0% property sales commissions.' },
  ];
  constructor() { this.load(); }
  load() { this.error.set(false); this.api.pricing().subscribe({ next: data => this.pricing.set(data), error: () => this.error.set(true) }); }
  money(price: string, symbol: string) { return `${symbol}${price.replace(/\.00$/, '')}`; }
  list() { void this.entry.startPropertyListing(); }
}
