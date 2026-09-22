import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { NotificationsApiService } from '../../core/api/account-api.services';
import { NotificationPreference } from '../../core/models/account.models';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  const preferences: NotificationPreference = {
    id: 'preference-1',
    email_enabled: true,
    in_app_enabled: true,
    new_message_email: true,
    viewing_updates_email: true,
    booking_updates_email: true,
    saved_search_email: false,
    listing_reminders_email: true,
    marketing_email: false,
    created_at: '2026-09-21T10:00:00Z',
    updated_at: '2026-09-21T10:00:00Z',
  };

  function setup(
    preferenceRequest = of(preferences),
    updatePreferences = vi.fn((body: Partial<NotificationPreference>) =>
      of({ ...preferences, ...body }),
    ),
  ) {
    const toast = { show: vi.fn() };
    const api = {
      preferences: vi.fn(() => preferenceRequest),
      updatePreferences,
    };
    const fixture = TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: NotificationsApiService, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: SeoService, useValue: { privatePage: vi.fn() } },
      ],
    }).createComponent(SettingsComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, api, toast };
  }

  it('loads real preference values and removes profile and unsupported account controls', () => {
    const { fixture } = setup();
    const element = fixture.nativeElement as HTMLElement;
    const toggles = Array.from(
      element.querySelectorAll<HTMLInputElement>('sp-toggle-switch input'),
    );

    expect(toggles).toHaveLength(7);
    expect(toggles.find((input) => input.getAttribute('aria-label') === 'Messages')?.checked).toBe(
      true,
    );
    expect(
      toggles.find((input) => input.getAttribute('aria-label') === 'Saved search alerts')?.checked,
    ).toBe(false);
    expect(element.textContent).not.toContain('Change email');
    expect(element.textContent).not.toContain('Change password');
    expect(element.textContent).not.toContain('Download my data');
    expect(element.textContent).not.toContain('Delete account');
  });

  it('shows matching skeleton rows until preferences finish loading', () => {
    const request = new Subject<NotificationPreference>();
    const { fixture } = setup(request);

    expect(fixture.nativeElement.querySelectorAll('.skeleton-row')).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('sp-toggle-switch')).toBeNull();

    request.next(preferences);
    request.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.preference-list')).toBeTruthy();
  });

  it('saves one toggle optimistically and prevents duplicate requests while it is pending', () => {
    const request = new Subject<NotificationPreference>();
    const update = vi.fn(() => request);
    const { component } = setup(of(preferences), update);
    const messages = component.notificationRows.find((row) => row.key === 'new_message_email')!;

    component.set(messages, false);
    component.set(messages, true);

    expect(component.prefs()?.new_message_email).toBe(false);
    expect(component.isSaving('new_message_email')).toBe(true);
    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({ new_message_email: false });

    request.next({ ...preferences, new_message_email: false });
    request.complete();

    expect(component.isSaving('new_message_email')).toBe(false);
  });

  it('rolls a failed toggle back and gives useful feedback', () => {
    const update = vi.fn(() => throwError(() => new Error('offline')));
    const { component, toast } = setup(of(preferences), update);
    const bookings = component.notificationRows.find((row) => row.key === 'booking_updates_email')!;

    component.set(bookings, false);

    expect(component.prefs()?.booking_updates_email).toBe(true);
    expect(toast.show).toHaveBeenCalledWith(
      "We couldn't update that preference. Please try again.",
      'error',
    );
  });

  it('offers retry after a loading failure', () => {
    const api = {
      preferences: vi
        .fn()
        .mockReturnValueOnce(throwError(() => new Error('offline')))
        .mockReturnValueOnce(of(preferences)),
      updatePreferences: vi.fn(),
    };
    const fixture = TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: NotificationsApiService, useValue: api },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: SeoService, useValue: { privatePage: vi.fn() } },
      ],
    }).createComponent(SettingsComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't load your notification preferences.",
    );
    (fixture.nativeElement.querySelector('.load-state button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(api.preferences).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.prefs()).toEqual(preferences);
  });

  it('disables child email preferences while the master email preference is off', () => {
    const { fixture } = setup(of({ ...preferences, email_enabled: false }));
    const messages = fixture.nativeElement.querySelector(
      'input[aria-label="Messages"]',
    ) as HTMLInputElement;
    const marketing = fixture.nativeElement.querySelector(
      'input[aria-label="Marketing communications"]',
    ) as HTMLInputElement;

    expect(messages.disabled).toBe(true);
    expect(marketing.disabled).toBe(false);
  });
});
