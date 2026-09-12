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
    features: {
      properties: true,
      stays: true,
      bookings: true,
      internal_messaging: true,
      registration: true,
    },
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
      features: {
        properties: true,
        stays: true,
        bookings: true,
        internal_messaging: true,
        registration: true,
      },
      map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 },
    });
    await TestBed.configureTestingModule({
      imports: [PublicHeaderComponent],
      providers: [
        provideRouter([
          { path: '', component: EmptyComponent },
          { path: 'agents', component: EmptyComponent },
          { path: 'login', component: EmptyComponent },
          { path: 'register', component: EmptyComponent },
          { path: 'properties', component: EmptyComponent },
          { path: 'properties/:slug', component: EmptyComponent },
          { path: 'stays', component: EmptyComponent },
          { path: 'account', component: EmptyComponent },
          { path: 'account/saved', component: EmptyComponent },
          { path: 'account/messages', component: EmptyComponent },
          { path: 'account/manage', component: EmptyComponent },
        ]),
        { provide: AuthService, useValue: auth },
        { provide: ConfigApiService, useValue: { config } },
        { provide: AccountActivityStore, useValue: activity },
      ],
    }).compileComponents();
  });

  function finishDrawerClose(
    fixture: ReturnType<typeof TestBed.createComponent<PublicHeaderComponent>>,
  ) {
    const drawer = fixture.nativeElement.querySelector('.drawer') as HTMLElement;
    const event = new Event('transitionend') as TransitionEvent;
    Object.defineProperty(event, 'propertyName', { value: 'transform' });
    drawer.dispatchEvent(event);
    fixture.detectChanges();
  }

  it('opens an anonymous drawer with login and registration routes', () => {
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toBe('Open menu');
    expect(button.getAttribute('aria-expanded')).toBe('false');

    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.menuState()).toBe('open');
    expect(fixture.nativeElement.textContent).toContain('Log in');
    expect(fixture.nativeElement.textContent).toContain('Create account');
    expect(fixture.nativeElement.textContent).toContain('List a Property');
    expect(fixture.nativeElement.textContent).toContain('Properties');
    expect(fixture.nativeElement.textContent).toContain('Stays');
    expect(fixture.nativeElement.textContent).toContain('Agents');
    expect(fixture.nativeElement.textContent).not.toContain('Rent');
    expect(fixture.nativeElement.textContent).not.toContain('Buy');
    expect(fixture.nativeElement.textContent).not.toContain('Saved');
    expect(fixture.nativeElement.textContent).not.toContain('Messages');
    expect(fixture.nativeElement.textContent).not.toContain('Session');
  });
  it('renders guest desktop navigation without account-only links', () => {
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    const headerText = (fixture.nativeElement.querySelector('header') as HTMLElement).textContent;
    const properties = fixture.nativeElement.querySelector(
      '.desktop-nav a[href="/properties"]',
    ) as HTMLAnchorElement;
    expect(headerText).toContain('Properties');
    expect(headerText).toContain('Stays');
    expect(headerText).toContain('Agents');
    expect(headerText).toContain('Log in');
    expect(headerText).toContain('Create account');
    expect(headerText).toContain('List a Property');
    expect(headerText).not.toContain('Rent');
    expect(headerText).not.toContain('Buy');
    expect(headerText).not.toContain('Saved');
    expect(headerText).not.toContain('Messages');
    expect(properties).toBeTruthy();
  });

  it('renders compact mobile shortcut icons without saved listings for guests', () => {
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();
    const shortcuts = fixture.nativeElement.querySelectorAll('.mobile-shortcuts a');
    const menu = fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement;

    expect(shortcuts.length).toBe(1);
    expect(shortcuts[0].getAttribute('aria-label')).toBe('Account');
    expect(shortcuts[0].querySelector('.fa-user')).toBeTruthy();
    expect(menu.querySelector('.fa-bars')).toBeTruthy();
  });

  it('shows authenticated seeker links and unread badges', () => {
    user.set({ first_name: 'Ava', onboarding_intents: ['LOOKING_FOR_PROPERTY'] });
    unreadMessages.set(7);
    unreadNotifications.set(3);
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    const headerText = (fixture.nativeElement.querySelector('header') as HTMLElement).textContent;
    expect(headerText).toContain('Properties');
    expect(headerText).toContain('Saved');
    expect(headerText).toContain('Messages');
    expect(headerText).toContain('Ava');
    expect(headerText).toContain('Log out');
    expect(headerText).toContain('List a Property');
    expect(headerText).not.toContain('Log in');
    expect(headerText).not.toContain('Create account');
    expect(headerText).not.toContain('Rent');
    expect(headerText).not.toContain('Buy');

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Saved');
    expect(text).toContain('Messages');
    expect(text).toContain('Agents');
    expect(text).toContain('Saved Searches / Alerts');
    expect(text).toContain('Notifications');
    expect(text).toContain('Log out');
    expect(text).not.toContain('Session');
    expect(text).toContain('7');
    expect(text).toContain('3');
  });

  it('keeps properties active on property detail routes', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/properties/another-bedroom');
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    const properties = fixture.nativeElement.querySelector(
      '.desktop-nav a[href="/properties"]',
    ) as HTMLAnchorElement;
    expect(properties?.textContent).toContain('Properties');
    expect(properties?.getAttribute('aria-current')).toBe('page');

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();
    const current = fixture.nativeElement.querySelector(
      '.drawer [aria-current="page"]',
    ) as HTMLAnchorElement;
    expect(current?.textContent).toContain('Properties');
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
    config.update((value) => ({
      ...value,
      features: {
        ...value.features,
        stays: false,
        bookings: false,
        internal_messaging: false,
        registration: false,
      },
    }));
    user.set({ first_name: 'Ava', onboarding_intents: ['PROPERTY_OWNER'] });
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.menu-button').click();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).not.toContain('Stays');
    expect(text).not.toContain('Messages');
    expect(text).not.toContain('Bookings');
    expect(text).not.toContain('Create account');
  });

  it('keeps the drawer mounted while closing, then unlocks scroll after transition', () => {
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();
    expect(document.body.style.position).toBe('fixed');

    fixture.nativeElement.querySelector('.backdrop').click();
    fixture.detectChanges();

    expect(fixture.componentInstance.menuState()).toBe('closing');
    expect(fixture.nativeElement.querySelector('.drawer.is-closing')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.backdrop.is-closing')).toBeTruthy();

    finishDrawerClose(fixture);

    expect(fixture.componentInstance.menuState()).toBe('closed');
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();
    expect(document.body.style.position).toBe('');
  });

  it('ignores repeated open and close clicks while transitions are in progress', () => {
    const fixture = TestBed.createComponent(PublicHeaderComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.menu-button') as HTMLButtonElement;

    button.click();
    button.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.drawer').length).toBe(1);

    fixture.componentInstance.closeMenu();
    fixture.componentInstance.closeMenu();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuState()).toBe('closing');

    finishDrawerClose(fixture);
    expect(fixture.componentInstance.menuState()).toBe('closed');
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
    expect(fixture.componentInstance.menuState()).toBe('closing');
    finishDrawerClose(fixture);
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(fixture.componentInstance.menuState()).toBe('closing');
    finishDrawerClose(fixture);
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    open();
    (Array.from(fixture.nativeElement.querySelectorAll('.drawer a')) as HTMLAnchorElement[])
      .find((link) => link.textContent?.includes('Saved'))
      ?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.menuState()).toBe('closing');
    finishDrawerClose(fixture);
    expect(fixture.nativeElement.querySelector('.drawer')).toBeNull();

    open();
    (Array.from(fixture.nativeElement.querySelectorAll('.drawer button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.includes('Log out'))
      ?.click();
    fixture.detectChanges();
    expect(auth.logout).toHaveBeenCalled();
    expect(fixture.componentInstance.menuState()).toBe('closing');
    finishDrawerClose(fixture);
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

    const current = fixture.nativeElement.querySelector(
      '[aria-current="page"]',
    ) as HTMLAnchorElement;
    expect(current.textContent).toContain('Messages');
  });
});
