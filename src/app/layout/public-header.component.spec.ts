import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { ConfigApiService } from '../core/api/config-api.service';
import { AccountActivityStore } from '../core/services/account-activity.store';
import { PublicHeaderComponent } from './public-header.component';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

describe('PublicHeaderComponent mobile navigation', () => {
  const user = signal<unknown | null>(null);
  const config = signal({
    default_country: 'SZ',
    default_currency: 'SZL',
    supported_currencies: ['SZL'],
    features: { properties: true, stays: true, bookings: true, internal_messaging: true, registration: true },
    map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
  });
  const unreadMessages = signal(0);
  const unreadNotifications = signal(0);
  const auth = {
    user,
    isAuthenticated: computed(() => user() !== null),
    logout: vi.fn(),
  };
  const activity = {
    unreadMessages: computed(() => unreadMessages()),
    unreadNotifications: computed(() => unreadNotifications()),
  };

  beforeEach(async () => {
    user.set(null);
    unreadMessages.set(0);
    unreadNotifications.set(0);
    auth.logout.mockClear();
    config.set({
      default_country: 'SZ',
      default_currency: 'SZL',
      supported_currencies: ['SZL'],
      features: { properties: true, stays: true, bookings: true, internal_messaging: true, registration: true },
      map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
    });
    await TestBed.configureTestingModule({
      imports: [PublicHeaderComponent],
      providers: [
        provideRouter([
          { path: '', component: EmptyComponent },
          { path: 'login', component: EmptyComponent },
          { path: 'properties', component: EmptyComponent },
          { path: 'stays', component: EmptyComponent },
          { path: 'account/messages', component: EmptyComponent },
          { path: 'account/manage', component: EmptyComponent },
        ]),
        { provide: AuthService, useValue: auth },
        { provide: ConfigApiService, useValue: { config } },
        { provide: AccountActivityStore, useValue: activity },
      ],
    }).compileComponents();
  });

  it('opens an anonymous drawer with login and registration routes', () => {
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Open menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Login');
    expect(fixture.nativeElement.textContent).toContain('Create Account');
    expect(fixture.nativeElement.textContent).toContain('List a Property');
    expect(fixture.nativeElement.textContent).not.toContain('Session');
  });

  it('shows authenticated seeker links and unread badges', () => {
    user.set({ first_name: 'Ava', onboarding_intents: ['LOOKING_FOR_PROPERTY'] });
    unreadMessages.set(7);
    unreadNotifications.set(3);
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Saved');
    expect(text).toContain('Messages');
    expect(text).toContain('Saved Searches / Alerts');
    expect(text).toContain('Notifications');
    expect(text).toContain('Logout');
    expect(text).not.toContain('Session');
    expect(text).toContain('7');
    expect(text).toContain('3');
  });

  it('shows supply-side management links for supply users', () => {
    user.set({ first_name: 'Owner', onboarding_intents: ['PROPERTY_OWNER'] });
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Manage Listings');
    expect(text).toContain('Management Dashboard');
    expect(text).toContain('Properties');
    expect(text).toContain('Verification');
  });

  it('omits feature-flagged links when disabled', () => {
    config.update((value) => ({ ...value, features: { ...value.features, stays: false, bookings: false, internal_messaging: false, registration: false } }));
    user.set({ first_name: 'Ava', onboarding_intents: ['PROPERTY_OWNER'] });
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Stays');
    expect(text).not.toContain('Messages');
    expect(text).not.toContain('Bookings');
    expect(text).not.toContain('Create Account');
  });

  it('closes on backdrop click, escape, route selection and logout', async () => {
    user.set({ first_name: 'Ava', onboarding_intents: ['LOOKING_FOR_PROPERTY'] });
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();
    const open = () => {
      fixture.nativeElement.querySelector('.menu-button').click();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.drawer')).toBeTruthy();
    };

    open();
    fixture.nativeElement.querySelector('.backdrop').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    open();
    (Array.from(fixture.nativeElement.querySelectorAll('.drawer a')) as HTMLAnchorElement[]).find((link) => link.textContent?.includes('Saved'))?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    open();
    (Array.from(fixture.nativeElement.querySelectorAll('.drawer button')) as HTMLButtonElement[]).find((button) => button.textContent?.includes('Logout'))?.click();
    fixture.detectChanges();
    expect(auth.logout).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();
  });

  it('marks the active route with aria-current', async () => {
    user.set({ first_name: 'Ava', onboarding_intents: ['LOOKING_FOR_PROPERTY'] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/account/messages');
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();

    const current = fixture.nativeElement.querySelector('[aria-current="page"]') as HTMLAnchorElement;
    expect(current.textContent).toContain('Messages');
  });
});
