import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { ConfigApiService } from '../core/api/config-api.service';
import { AgencyManagementApiService } from '../core/api/manage-api.services';
import { AuthService } from '../core/auth/auth.service';
import { AccountActivityStore } from '../core/services/account-activity.store';
import { SeoService } from '../core/services/seo.service';
import { UserCapabilityService } from '../core/services/user-capability.service';
import { AccountShellComponent } from './account-shell.component';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

describe('AccountShellComponent grouped navigation', () => {
  const user = signal<any>({ first_name: 'Andy', is_email_verified: true });
  const features = signal({ stays: true, bookings: true, internal_messaging: true });
  const mine = vi.fn();
  const messages = signal(0);
  const notifications = signal(0);
  const capabilities = signal<any>({
    canAccessManageDashboard: true,
    canManageProperties: true,
    canManageStays: true,
    canAccessVerification: true,
    canCreateAgency: true,
    canAccessAgencyTools: false,
    canManageAgency: false,
  });
  beforeEach(() => {
    user.set({ first_name: 'Andy', is_email_verified: true });
    features.set({ stays: true, bookings: true, internal_messaging: true });
    messages.set(0);
    notifications.set(0);
    capabilities.set({
      canAccessManageDashboard: true,
      canManageProperties: true,
      canManageStays: true,
      canAccessVerification: true,
      canCreateAgency: true,
      canAccessAgencyTools: false,
      canManageAgency: false,
    });
    mine.mockReset().mockReturnValue(of([]));
    TestBed.configureTestingModule({
      imports: [AccountShellComponent],
      providers: [
        provideRouter([{ path: '**', component: EmptyComponent }]),
        { provide: AuthService, useValue: { user, isAuthenticated: computed(() => !!user()) } },
        {
          provide: ConfigApiService,
          useValue: { config: computed(() => ({ features: features() })) },
        },
        { provide: AgencyManagementApiService, useValue: { mine } },
        { provide: UserCapabilityService, useValue: { capabilities, refresh: vi.fn() } },
        { provide: SeoService, useValue: { privatePage: vi.fn() } },
        {
          provide: AccountActivityStore,
          useValue: {
            refresh: vi.fn(),
            startPolling: vi.fn(),
            stopPolling: vi.fn(),
            unreadMessages: messages,
            unreadNotifications: notifications,
          },
        },
      ],
    });
  });
  function create() {
    const fixture = TestBed.createComponent(AccountShellComponent);
    fixture.detectChanges();
    return fixture;
  }
  it('groups account, activity, management and contextual agency links', () => {
    const f = create();
    const headings = [...f.nativeElement.querySelectorAll('nav h2')].map((h: any) =>
      h.textContent.trim(),
    );
    expect(headings).toEqual(['Account', 'Activity', 'Manage', 'Agency']);
    const section = (id: string) =>
      f.nativeElement.querySelector('[aria-labelledby="account-heading-' + id + '"]');
    expect(section('activity').textContent).toContain('Viewings');
    expect(section('activity').textContent).toContain('Bookings');
    expect(section('account').textContent).not.toContain('Viewings');
    expect(section('manage').textContent).not.toContain('agency');
    expect(section('agency').textContent).toContain('Create an agency');
    expect(f.nativeElement.querySelector('a[href="/staff"]')).toBeNull();
  });
  it.each(['OWNER', 'ADMIN', 'AGENT'])('shares agency permissions for %s', (role) => {
    capabilities.update((value: any) => ({
      ...value,
      canCreateAgency: false,
      canAccessAgencyTools: true,
      canManageAgency: role !== 'AGENT',
    }));
    const f = create();
    expect(f.nativeElement.querySelector('a[href="/account/manage/agency"]')).toBeTruthy();
    expect(!!f.nativeElement.querySelector('a[href="/account/manage/agency/team"]')).toBe(
      role !== 'AGENT',
    );
    expect(f.nativeElement.querySelector('a[href="/account/manage/agency/create"]')).toBeNull();
  });
  it('exposes a separate staff workspace link without moderation children', () => {
    user.update((value) => ({ ...value, is_staff: true }));
    const f = create();
    expect(f.nativeElement.querySelector('.staff-switch a').getAttribute('href')).toBe('/staff');
    expect(f.nativeElement.querySelector('a[href="/staff/listings"]')).toBeNull();
  });
  it('hides the sidebar entirely for guests', () => {
    user.set(null);
    expect(create().nativeElement.querySelector('aside')).toBeNull();
  });
  it('hides empty Manage and Agency groups for a seeker-only account', () => {
    capabilities.set({
      canAccessManageDashboard: false,
      canManageProperties: false,
      canManageStays: false,
      canAccessVerification: false,
      canCreateAgency: false,
      canAccessAgencyTools: false,
      canManageAgency: false,
    });
    const f = create();
    expect(f.nativeElement.textContent).not.toContain('Manage');
    expect(f.nativeElement.querySelector('[aria-labelledby="account-heading-manage"]')).toBeNull();
    expect(f.nativeElement.querySelector('[aria-labelledby="account-heading-agency"]')).toBeNull();
  });
  it('respects feature flags on desktop', () => {
    features.set({ stays: false, bookings: false, internal_messaging: false });
    const f = create();
    for (const path of ['/account/messages', '/account/bookings', '/account/manage/stays'])
      expect(f.nativeElement.querySelector('a[href="' + path + '"]')).toBeNull();
  });
  it('shows accessible unread badges and hides zero counts', () => {
    messages.set(3);
    notifications.set(2);
    const f = create();
    expect(f.nativeElement.querySelector('[aria-label="3 unread messages"]')).toBeTruthy();
    expect(f.nativeElement.querySelector('[aria-label="2 unread notifications"]')).toBeTruthy();
    messages.set(0);
    notifications.set(0);
    f.detectChanges();
    expect(f.nativeElement.querySelector('b')).toBeNull();
  });
  it.each([
    '/account/profile?tab=details',
    '/account/manage/properties/p1/edit',
    '/account/manage/agency/team',
    '/account/manage/agency/profile',
  ])('marks only one item active on %s', async (url) => {
    if (url.includes('/agency/')) {
      capabilities.update((value: any) => ({
        ...value,
        canCreateAgency: false,
        canAccessAgencyTools: true,
        canManageAgency: true,
      }));
    }
    const f = create();
    await TestBed.inject(Router).navigateByUrl(url);
    f.detectChanges();
    const active = f.nativeElement.querySelectorAll('a[aria-current="page"]');
    expect(active.length).toBe(1);
    expect(active[0].getAttribute('href')).not.toBe('/account');
    expect(active[0].getAttribute('href')).not.toBe('/account/manage');
  });
});
