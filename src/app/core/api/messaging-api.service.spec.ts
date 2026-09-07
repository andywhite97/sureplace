import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessagingApiService } from './messaging-api.service';
describe('MessagingApiService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('loads list, detail and paginated messages', () => {
    const api = TestBed.inject(MessagingApiService),
      http = TestBed.inject(HttpTestingController);
    api.list().subscribe();
    http.expectOne('/api/v1/conversations/').flush({ results: [] });
    api.detail('c1').subscribe();
    http.expectOne('/api/v1/conversations/c1/').flush({});
    api.messages('c1', 2).subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/conversations/c1/messages/');
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ results: [] });
  });
  it('only sends normal text and marks read', () => {
    const api = TestBed.inject(MessagingApiService),
      http = TestBed.inject(HttpTestingController);
    api.send('c1', { body: 'Hello', message_type: 'TEXT' }).subscribe();
    const send = http.expectOne('/api/v1/conversations/c1/messages/');
    expect(send.request.body).toEqual({ body: 'Hello', message_type: 'TEXT' });
    send.flush({});
    api.markRead('c1').subscribe();
    http.expectOne('/api/v1/conversations/c1/mark-read/').flush({ unread_count: 0 });
  });
});
