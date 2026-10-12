import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { StayPricingComponent } from './stay-pricing.component';
import { StayEntitlementsApiService } from '../core/api/stay-entitlements-api.service';

describe('Stay pricing catalogue', () => {
  let api: any;
  beforeEach(() => {
    api = {pricing:vi.fn(()=>of({currency_symbol:'E', checkout_available:false, booking_commission_percent:0,
      plans:[{code:'HOST_FREE',display_name:'Configured Free Host',price:'0.00',billing_interval:'FOREVER',active_listing_limit:3},
        {code:'HOST_PRO',display_name:'Configured Host Pro',price:'209.00',billing_interval:'MONTH',active_listing_limit:6}],
      addons:[{code:'SINGLE_STAY_EXTRA',display_name:'Extra Stay',price:'89.00',quantity:1,duration_days:90}],
      promotions:[{code:'STAY_BOOST_7D',display_name:'Stay Boost',price:'69.00',duration_days:7,operational:false,checkout_available:false,description:'Coming soon. Does not add listing capacity.'}],
      features:['Room availability calendars','Booking management','Messaging']}))};
    TestBed.configureTestingModule({imports:[StayPricingComponent], providers:[provideRouter([]), {provide:StayEntitlementsApiService,useValue:api}]});
  });
  it('renders backend plan prices and allowances with free-plan prominence', () => {
    const f = TestBed.createComponent(StayPricingComponent); f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.textContent).toContain('3 active stays');
    expect(el.textContent).toContain('6 active stays');
    expect(el.textContent).toContain('E209'); expect(el.textContent).toContain('E89'); expect(el.textContent).toContain('E69');
    expect(el.querySelector('.prominent')?.textContent).toContain('Configured Free Host');
    expect(el.querySelectorAll('.plans button').length).toBe(1);
    expect(el.querySelectorAll('.addons button, .promotions button').length).toBe(0);
    expect(el.textContent).toContain('0% booking commission');
    expect(el.querySelector('caption')?.textContent).toContain('not added');
    expect(el.querySelectorAll('details').length).toBe(8);
  });
  it('offers retry when catalogue loading fails', () => {
    api.pricing.mockReturnValue(throwError(()=>new Error('Offline')));
    const f = TestBed.createComponent(StayPricingComponent); f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain('could not be loaded');
    f.nativeElement.querySelector('button').click(); expect(api.pricing).toHaveBeenCalledTimes(2);
  });
});
