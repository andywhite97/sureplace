import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PropertyPricingComponent } from './property-pricing.component';
import { PropertyEntitlementsApiService } from '../core/api/property-entitlements-api.service';

describe('Property pricing source of truth', () => {
  let api: { pricing: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    api = { pricing: vi.fn(() => of({ currency_symbol: 'E', property_sales_commission_percent: 0,
      plans: [{ code: 'AGENCY_FREE', display_name: 'Configured Agency', price: '0.00', billing_interval: 'FOREVER', active_listing_limit: 7, applicable_account_types: ['AGENCY'] },
        { code: 'STARTER', display_name: 'Configured Starter', price: '159.00', billing_interval: 'MONTH', active_listing_limit: 12, applicable_account_types: ['INDIVIDUAL', 'AGENCY'] }],
      addons: [{ code: 'SINGLE_EXTRA', display_name: 'Single Listing', price: '59.00', quantity: 1, duration_days: 90 }],
      features: ['Property photos', 'Enquiry messaging'], checkout_available: false })) };
    TestBed.configureTestingModule({ imports: [PropertyPricingComponent], providers: [provideRouter([]), { provide: PropertyEntitlementsApiService, useValue: api }] });
  });
  it('renders configured prices and limits, free agency prominence and honest checkout states', () => {
    const fixture = TestBed.createComponent(PropertyPricingComponent); fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('E159');
    expect(element.textContent).toContain('12 active listings');
    expect(element.textContent).toContain('7 active listings');
    expect(element.textContent).toContain('E59');
    expect(element.querySelector('.prominent')?.textContent).toContain('Configured Agency');
    expect(element.textContent).toContain('Paid checkout coming soon');
    expect(element.textContent).toContain('0% property sales commissions');
    expect(element.querySelectorAll('.plans button').length).toBe(0);
  });
  it('shows a retry when prices cannot be fetched', () => {
    api.pricing.mockReturnValue(throwError(() => new Error('Offline')));
    const fixture = TestBed.createComponent(PropertyPricingComponent); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('could not be loaded');
    fixture.nativeElement.querySelector('button').click();
    expect(api.pricing).toHaveBeenCalledTimes(2);
  });
});
