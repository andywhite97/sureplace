import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { App } from '../../app';
import { AuthService } from '../../core/auth/auth.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { AccountActivityStore } from '../../core/services/account-activity.store';
import { AgencyNavigationService } from '../../core/services/agency-navigation.service';
import { staffGuard } from '../../core/guards/auth.guard';
import { StaffShellComponent } from './staff-shell.component';

@Component({ standalone: true, template: '<h1>Staff content</h1>' })
class EmptyComponent {}

describe('Staff Console workspace', () => {
  const user = signal<any>({ first_name: 'Andy', last_name: 'Smith', is_staff: true });
  beforeEach(() => {
    user.set({ first_name: 'Andy', last_name: 'Smith', is_staff: true });
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          {
            path: 'staff',
            component: StaffShellComponent,
            canActivate: [staffGuard],
            children: [
              { path: '', component: EmptyComponent },
              { path: 'listings', component: EmptyComponent },
              { path: 'listings/:id', component: EmptyComponent },
            ],
          },
          { path: 'account', component: EmptyComponent },
          { path: 'login', component: EmptyComponent },
          { path: '', component: EmptyComponent },
        ]),
        {
          provide: AuthService,
          useValue: {
            user,
            initialize: () => of(user()),
            status: computed(() => (user() ? 'authenticated' : 'unauthenticated')),
            isAuthenticated: computed(() => !!user()),
            logout: vi.fn(),
          },
        },
        {
          provide: ConfigApiService,
          useValue: {
            config: signal({
              features: {
                stays: true,
                bookings: true,
                internal_messaging: true,
                registration: true,
              },
            }),
          },
        },
        {
          provide: AccountActivityStore,
          useValue: { unreadMessages: () => 0, unreadNotifications: () => 0 },
        },
        { provide: AgencyNavigationService, useValue: { links: () => [], refresh: vi.fn() } },
      ],
    });
  });
  async function open(path = '/staff') {
    const f = TestBed.createComponent(App);
    f.detectChanges();
    await TestBed.inject(Router).navigateByUrl(path);
    f.detectChanges();
    await f.whenStable();
    return f;
  }
  it('replaces consumer navigation and footer with staff identity and grouped sidebar', async () => {
    const f = await open();
    expect(f.nativeElement.querySelector('.staff-header')).toBeTruthy();
    expect(f.nativeElement.querySelector('.desktop-nav')).toBeNull();
    expect(f.nativeElement.querySelector('sp-footer')).toBeNull();
    expect(f.nativeElement.querySelector('sp-mobile-nav')).toBeNull();
    expect(f.nativeElement.querySelector('.staff-identity').textContent).toContain('Andy');
    expect(
      [...f.nativeElement.querySelectorAll('.staff-layout nav h2')].map((x: any) =>
        x.textContent.trim(),
      ),
    ).toEqual(['Staff Console', 'Moderation']);
    expect(f.nativeElement.querySelector('a[href="/staff/reports"]')).toBeNull();
  });
  it('marks only Property Listings active on review pages', async () => {
    const f = await open('/staff/listings/p1');
    const active = f.nativeElement.querySelectorAll('.staff-layout nav [aria-current="page"]');
    expect(active.length).toBe(1);
    expect(active[0].textContent).toContain('Property Listings');
  });
  it('uses the existing mobile staff accordion with current context', async () => {
    const f = await open('/staff/listings/p1');
    f.nativeElement.querySelector('.menu-button').click();
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('.drawer').length).toBe(1);
    expect(
      f.nativeElement
        .querySelector('[aria-controls="mobile-section-staff"]')
        .getAttribute('aria-expanded'),
    ).toBe('true');
  });
  it('submits functional listing search and can exit without logging out', async () => {
    const f = await open();
    const input = f.nativeElement.querySelector('.staff-search input');
    input.value = 'SP-123';
    f.nativeElement
      .querySelector('.staff-search')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await f.whenStable();
    f.detectChanges();
    expect(TestBed.inject(Router).parseUrl(TestBed.inject(Router).url).queryParams['search']).toBe(
      'SP-123',
    );
    f.nativeElement.querySelector('.exit-console').click();
    await f.whenStable();
    f.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/account');
    expect(f.nativeElement.querySelector('.desktop-nav')).toBeTruthy();
    expect(user()).toBeTruthy();
  });
  it('denies the staff workspace to non-staff users', async () => {
    user.set({ first_name: 'Seeker', is_staff: false });
    const f = await open();
    expect(TestBed.inject(Router).url).toBe('/account');
    expect(f.nativeElement.querySelector('.staff-layout')).toBeNull();
  });
});
