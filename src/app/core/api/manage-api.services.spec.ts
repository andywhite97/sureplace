import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ManagerBookingsApiService,
  ManagerViewingsApiService,
  PropertyManagementApiService,
  RoomManagementApiService,
  StayManagementApiService,
  VerificationApiService,
} from './manage-api.services';

describe('management api services', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads manager portfolios and workflow actions', () => {
    const properties = TestBed.inject(PropertyManagementApiService);
    properties.mine().subscribe();
    http.expectOne('/api/v1/properties/mine/').flush({ results: [] });
    properties.submit('p1').subscribe();
    http.expectOne('/api/v1/properties/p1/submit/').flush({});
    properties.confirmAvailability('p1').subscribe();
    http.expectOne('/api/v1/properties/p1/confirm-availability/').flush({});
    properties.updateImage('p1', 'img1', { is_cover: true }).subscribe();
    const propertyImage = http.expectOne('/api/v1/properties/p1/images/');
    expect(propertyImage.request.body).toEqual({ id: 'img1', is_cover: true });
    propertyImage.flush({});
    properties.deleteImage('p1', 'img1').subscribe();
    http.expectOne('/api/v1/properties/p1/images/?id=img1').flush({});

    const stays = TestBed.inject(StayManagementApiService);
    stays.mine().subscribe();
    http.expectOne('/api/v1/stays/mine/').flush({ results: [] });
    stays.rooms('s1').subscribe();
    http.expectOne('/api/v1/stays/s1/rooms/').flush([]);
    stays.updateImage('s1', 'img2', { sort_order: 1 }).subscribe();
    const stayImage = http.expectOne('/api/v1/stays/s1/images/');
    expect(stayImage.request.body).toEqual({ id: 'img2', sort_order: 1 });
    stayImage.flush({});
    stays.deleteImage('s1', 'img2').subscribe();
    http.expectOne('/api/v1/stays/s1/images/?id=img2').flush({});
  });

  it('updates rooms and bulk availability', () => {
    const rooms = TestBed.inject(RoomManagementApiService);
    rooms.update('r1', { is_active: false }).subscribe();
    http.expectOne('/api/v1/rooms/r1/').flush({});
    rooms.calendar('r1', '2026-09-01', '2026-09-30').subscribe();
    const calendar = http.expectOne((r) => r.url === '/api/v1/rooms/r1/calendar/');
    expect(calendar.request.params.get('start')).toBe('2026-09-01');
    calendar.flush([]);
    rooms.bulkAvailability('r1', { start_date: '2026-09-01', end_date: '2026-09-02', is_blocked: true }).subscribe();
    http.expectOne('/api/v1/rooms/r1/availability/bulk/').flush({ updated: 2 });
    rooms.updateImage('r1', 'img3', { is_cover: true }).subscribe();
    const roomImage = http.expectOne('/api/v1/rooms/r1/images/');
    expect(roomImage.request.body).toEqual({ id: 'img3', is_cover: true });
    roomImage.flush({});
    rooms.deleteImage('r1', 'img3').subscribe();
    http.expectOne('/api/v1/rooms/r1/images/?id=img3').flush({});
  });

  it('uses manager scopes and verification routes', () => {
    TestBed.inject(ManagerViewingsApiService).list().subscribe();
    const viewings = http.expectOne((r) => r.url === '/api/v1/viewing-requests/');
    expect(viewings.request.params.get('scope')).toBe('manager');
    viewings.flush({ results: [] });
    TestBed.inject(ManagerBookingsApiService).action('b1', 'confirm').subscribe();
    http.expectOne('/api/v1/bookings/b1/confirm/').flush({});
    const verification = TestBed.inject(VerificationApiService);
    verification.list().subscribe();
    http.expectOne('/api/v1/verification/requests/').flush({ results: [] });
    verification.create({ verification_type: 'PROPERTY', property: 'p1' }).subscribe();
    const create = http.expectOne('/api/v1/verification/requests/');
    expect(create.request.body).toEqual({ verification_type: 'PROPERTY', property: 'p1' });
    create.flush({});
    verification.types().subscribe();
    http.expectOne('/api/v1/verification/types/').flush([]);
  });
});
