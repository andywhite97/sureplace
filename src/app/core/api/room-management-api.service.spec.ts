import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RoomManagementApiService } from './manage-api.services';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { AuthService } from '../auth/auth.service';

describe('Room image API', () => {
  it('uploads multipart with auth to the canonical room endpoint, without forcing a content type', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { accessToken: () => 'test-access' } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const form = new FormData();
    const image = new File(['photo'], 'suite.jpg', { type: 'image/jpeg' });
    form.set('image', image);
    form.set('sort_order', '0');
    form.set('is_cover', 'true');
    TestBed.inject(RoomManagementApiService).uploadImage('room-id', form).subscribe();
    const request = http.expectOne('/api/v1/rooms/room-id/images/');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access');
    expect(request.request.headers.has('Content-Type')).toBe(false);
    expect(request.request.body.get('image')).toBe(image);
    request.flush({ id: 'photo-id', image: '/persisted.jpg', sort_order: 0, is_cover: true });
    http.verify();
  });
});
