import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PropertyContactComponent } from './property-contact.component';
import { AuthService } from '../../../core/auth/auth.service';
import { PropertyActionsApiService } from '../../../core/api/property-actions-api.service';
import { MessagingApiService } from '../../../core/api/messaging-api.service';
import { ToastService } from '../../../core/services/toast.service';
describe('PropertyContactComponent', () => {
  const property: any = {
    id: 'p1',
    slug: 'home',
    public_id: 'SP-1',
    title: 'Green Home',
    agent: { name: 'Agent Demo', whatsapp_number: '+268 7612 3456' },
    agency: { name: 'Agency' },
    verification_badges: [{ type: 'AGENT', label: 'Verified Agent' }],
  };
  const authenticated = signal(true);
  const api = {
    viewing: vi.fn(() => of({ id: 'v1' })),
    report: vi.fn(() => of({ id: 'r1' })),
  };
  const messaging = { createForProperty: vi.fn(() => of({ id: 'c1' })) };
  beforeEach(() => {
    authenticated.set(true);
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      imports: [PropertyContactComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
        { provide: PropertyActionsApiService, useValue: api },
        { provide: MessagingApiService, useValue: messaging },
        { provide: ToastService, useValue: { show: vi.fn() } },
      ],
    });
  });
  afterEach(() => {
    document.getElementById('sureplace-overlay-root')?.remove();
    document.body.style.overflow = '';
  });
  function create() {
    const f = TestBed.createComponent(PropertyContactComponent);
    f.componentRef.setInput('property', property);
    f.detectChanges();
    return f;
  }
  it('creates a conversation for authenticated users', () => {
    const f = create();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    f.componentInstance.message();
    expect(messaging.createForProperty).toHaveBeenCalledWith('p1', expect.stringContaining('SP-1'));
    expect(nav).toHaveBeenCalledWith(['/account/messages', 'c1']);
  });
  it('redirects anonymous message and viewing actions to login', () => {
    authenticated.set(false);
    const f = create();
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    f.componentInstance.message();
    expect(nav).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/properties/home' },
    });
  });
  it('builds an encoded WhatsApp link and hides it without a number', () => {
    const f = create();
    expect(f.componentInstance.whatsapp()).toContain('wa.me/26876123456');
    expect(f.componentInstance.whatsapp()).toContain('SP-1');
    f.componentRef.setInput('property', { ...property, agent: null });
    expect(f.componentInstance.whatsapp()).toBeNull();
  });
  it('opens, validates and submits a viewing request', () => {
    const f = create();
    f.componentInstance.openViewing();
    expect(f.componentInstance.modal()).toBe('viewing');
    f.componentInstance.viewingForm.setValue({
      requested_date: '2099-01-01',
      requested_time: '10:00',
      alternative_date: '',
      alternative_time: '',
      notes: 'Please confirm',
    });
    f.componentInstance.submitViewing();
    expect(api.viewing).toHaveBeenCalled();
    expect(f.componentInstance.success()).toBe(true);
  });
  it('ports the viewing overlay to the top-level overlay root and removes it on close', () => {
    const f = create();
    const trigger = f.nativeElement.querySelector('.secondary:last-of-type') as HTMLButtonElement;
    trigger.focus();
    f.componentInstance.openViewing();
    f.detectChanges();

    const overlay = document.body.querySelector<HTMLElement>(
      '#sureplace-overlay-root .property-contact-overlay',
    );
    expect(overlay).toBeTruthy();
    expect(f.nativeElement.querySelector('.property-contact-overlay')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');

    f.componentInstance.close();
    f.detectChanges();
    expect(document.body.querySelector('.property-contact-overlay')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger);
  });
  it('uses the same top-level overlay root for report listing', () => {
    const f = create();
    f.componentInstance.openReport();
    f.detectChanges();

    const overlay = document.body.querySelector<HTMLElement>(
      '#sureplace-overlay-root [data-sureplace-overlay="property-contact"]',
    );
    expect(overlay).toBeTruthy();
    expect(overlay?.textContent).toContain('Report this listing');
  });
  it('shows viewing domain errors', () => {
    api.viewing.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'An identical request exists.' } })) as never,
    );
    const f = create();
    f.componentInstance.viewingForm.patchValue({
      requested_date: '2099-01-01',
      requested_time: '10:00',
    });
    f.componentInstance.submitViewing();
    expect(f.componentInstance.error()).toContain('identical');
  });
  it('submits reports and handles API errors', () => {
    const f = create();
    f.componentInstance.openReport();
    f.componentInstance.submitReport();
    expect(api.report).toHaveBeenCalledWith('p1', 'SCAM', '');
    expect(f.componentInstance.success()).toBe(true);
    api.report.mockReturnValueOnce(
      throwError(() => ({ error: { message: 'Already reported' } })) as never,
    );
    f.componentInstance.openReport();
    f.componentInstance.submitReport();
    expect(f.componentInstance.error()).toBe('Already reported');
  });
});
