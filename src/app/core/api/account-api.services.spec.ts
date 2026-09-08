import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  AccountSummaryApiService,
  BookingsApiService,
  NotificationsApiService,
  ProfileApiService,
  SavedSearchesApiService,
  ViewingsApiService,
} from './account-api.services';

describe('account api services', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads account summary and resource lists', () => {
    TestBed.inject(AccountSummaryApiService).summary().subscribe();
    http.expectOne('/api/v1/dashboard/seeker-summary/').flush({});
    TestBed.inject(ViewingsApiService).list().subscribe();
    http.expectOne('/api/v1/viewing-requests/').flush({ results: [] });
    TestBed.inject(BookingsApiService).list().subscribe();
    http.expectOne('/api/v1/bookings/').flush({ results: [] });
    TestBed.inject(NotificationsApiService).list().subscribe();
    http.expectOne('/api/v1/notifications/').flush({ results: [] });
  });

  it('supports saved-search actions', () => {
    const api = TestBed.inject(SavedSearchesApiService);
    api.create({ name: 'Mbabane stays', search_type: 'STAY', criteria: { town: 'Mbabane' }, notifications_enabled: true }).subscribe();
    http.expectOne('/api/v1/saved-searches/').flush({});
    api.patch('s1', { notifications_enabled: false }).subscribe();
    http.expectOne('/api/v1/saved-searches/s1/').flush({});
    api.check('s1').subscribe();
    http.expectOne('/api/v1/saved-searches/s1/check/').flush({ new_matches: 0 });
    api.delete('s1').subscribe();
    http.expectOne('/api/v1/saved-searches/s1/').flush({});
  });

  it('marks notifications and updates profile', () => {
    const notifications = TestBed.inject(NotificationsApiService);
    notifications.markRead('n1').subscribe();
    http.expectOne('/api/v1/notifications/n1/mark-read/').flush({});
    notifications.markAllRead().subscribe();
    http.expectOne('/api/v1/notifications/mark-all-read/').flush({ updated: 1 });
    notifications.updatePreferences({ new_message_email: false }).subscribe();
    http.expectOne('/api/v1/notification-preferences/me/').flush({});
    TestBed.inject(ProfileApiService).update({ first_name: 'A', last_name: '', phone_number: '', onboarding_intents: [] }).subscribe();
    http.expectOne('/api/v1/auth/me/').flush({});
  });
});
