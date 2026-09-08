import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ConfigApiService } from '../core/api/config-api.service';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';
import { MobileNavigationComponent } from './mobile-navigation.component';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

describe('MobileNavigationComponent', () => {
  const user = signal<unknown | null>(null);
  const config = signal({
    default_country: 'SZ',
    default_currency: 'SZL',
    supported_currencies: ['SZL'],
    features: { properties: true, stays: true, bookings: true, internal_messaging: true, registration: true },
    map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
  });
  const unreadMessages = signal(0);

  beforeEach(async () => {
    user.set({ first_name: 'Ava' });
    unreadMessages.set(0);
    config.set({
      default_country: 'SZ',
      default_currency: 'SZL',
      supported_currencies: ['SZL'],
      features: { properties: true, stays: true, bookings: true, internal_messaging: true, registration: true },
      map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
    });
    await TestBed.configureTestingModule({
      imports: [MobileNavigationComponent],
      providers: [
        provideRouter([
          { path: '', component: EmptyComponent },
          { path: 'account/saved', component: EmptyComponent },
          { path: 'account/messages', component: EmptyComponent },
          { path: 'account/messages/:id', component: EmptyComponent },
          { path: 'account/manage/properties/:id/edit', component: EmptyComponent },
        ]),
        { provide: AuthService, useValue: { user, isAuthenticated: computed(() => user() !== null) } },
        { provide: ConfigApiService, useValue: { config } },
        { provide: AccountActivityStore, useValue: { unreadMessages: computed(() => unreadMessages()) } },
      ],
    }).compileComponents();
  });

  it('renders only high-frequency authenticated seeker actions', () => {
    unreadMessages.set(4);
    const fixture = TestBed.createComponent(MobileNavigationComponent);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Explore');
    expect(text).toContain('Saved');
    expect(text).toContain('Messages');
    expect(text).toContain('Account');
    expect(text).toContain('4');
    expect(text).not.toContain('Bookings');
    expect(text).not.toContain('Notifications');
  });

  it('respects the messaging feature flag', () => {
    config.update((value) => ({ ...value, features: { ...value.features, internal_messaging: false } }));
    const fixture = TestBed.createComponent(MobileNavigationComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Messages');
  });

  it('hides on contextual conversation and management form routes', async () => {
    const router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(MobileNavigationComponent);

    await router.navigateByUrl('/account/messages/c1');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();

    await router.navigateByUrl('/account/manage/properties/p1/edit');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });
});
