import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReferenceApiService } from './reference-api.service';

describe('Reference options cache', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );
  it('shares and caches room choices across loads', () => {
    const service = TestBed.inject(ReferenceApiService),
      http = TestBed.inject(HttpTestingController);
    service.load().subscribe();
    service.load().subscribe();
    http
      .expectOne(
        (request) =>
          request.url === '/api/v1/reference/' &&
          request.params.get('schema') === 'room-options-v1',
      )
      .flush({
        bed_configurations: [{ value: 'QUEEN', label: 'Queen bed' }],
        bathroom_types: [{ value: 'PRIVATE', label: 'Private bathroom' }],
      });
    service.load().subscribe();
    http.expectNone((request) => request.url === '/api/v1/reference/');
    expect(service.data().bed_configurations?.[0].value).toBe('QUEEN');
    http.verify();
  });
  it('retries after failure without caching an empty success', () => {
    const service = TestBed.inject(ReferenceApiService),
      http = TestBed.inject(HttpTestingController);
    service.load().subscribe();
    http
      .expectOne(
        (request) =>
          request.url === '/api/v1/reference/' &&
          request.params.get('schema') === 'room-options-v1',
      )
      .flush({}, { status: 500, statusText: 'Error' });
    expect(service.error()).toBe(true);
    service.refresh().subscribe();
    http
      .expectOne(
        (request) =>
          request.url === '/api/v1/reference/' &&
          request.params.get('schema') === 'room-options-v1',
      )
      .flush({ bed_configurations: [{ value: 'KING', label: 'King bed' }] });
    expect(service.error()).toBe(false);
    expect(service.data().bed_configurations?.[0].value).toBe('KING');
    http.verify();
  });
});
