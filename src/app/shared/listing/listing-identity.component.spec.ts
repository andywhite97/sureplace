import { TestBed } from '@angular/core/testing';
import { ListingIdentityComponent } from './listing-identity.component';

describe('ListingIdentityComponent', () => {
  it('shows both the agency logo and agent photo, handles failed photos and accepts an updated photo', () => {
    const fixture = TestBed.createComponent(ListingIdentityComponent);
    const identity = {
      kind: 'AGENCY', name: 'Valley Estates', role: 'Real estate agency',
      image: '/media/agency.png', verification_status: null, profile_slug: 'valley-estates',
      representative_name: 'Ava Hill', representative_image: '/media/ava.jpg',
    };
    fixture.componentRef.setInput('identity', identity);
    fixture.detectChanges();
    const images = fixture.nativeElement.querySelectorAll('img');
    expect(images[0].getAttribute('src')).toBe('/media/agency.png');
    expect(images[0].classList.contains('logo')).toBe(true);
    expect(images[1].getAttribute('src')).toBe('/media/ava.jpg');
    images[1].dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.representative').textContent).toContain('AH');
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(1);
    fixture.componentRef.setInput('identity', { ...identity, representative_image: '/media/ava-new.jpg' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.representative img').getAttribute('src')).toBe('/media/ava-new.jpg');
  });

  it('preserves names with fallbacks when neither image is available', () => {
    const fixture = TestBed.createComponent(ListingIdentityComponent);
    fixture.componentRef.setInput('identity', {
      kind: 'AGENCY', name: 'Valley Estates', role: 'Real estate agency', image: null,
      representative_name: 'Ava Hill', representative_image: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.fa-building')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Valley Estates');
    expect(fixture.nativeElement.textContent).toContain('Ava Hill');
    expect(fixture.nativeElement.textContent).toContain('AH');
  });
});
