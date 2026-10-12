import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { staffAccessGuard } from './auth.guard';

describe('stay staff access', () => {
  async function check(user: object, path: string, required: string[]) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: { initialize: () => of(user), user: () => user } }] });
    const result = TestBed.runInInjectionContext(() => staffAccessGuard({ data: { staffPermissions: required }, routeConfig: { path } } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    return firstValueFrom(result as Observable<boolean | UrlTree>);
  }
  it('routes a stay-only reviewer to the stay queue from the staff entry page', async () => {
    const result = await check({ is_staff: true, staff_permissions: ['stays.review_stay'] }, '', ['properties.review_propertylisting']);
    expect(String(result)).toBe('/staff/stays');
  });
  it('allows a superuser even before new permission metadata is refreshed', async () => {
    expect(await check({ is_staff: true, is_superuser: true, staff_permissions: [] }, 'stays', ['stays.review_stay'])).toBe(true);
  });
  it('denies stay access to a property-only reviewer', async () => {
    const result = await check({ is_staff: true, staff_permissions: ['properties.review_propertylisting'] }, 'stays', ['stays.review_stay']);
    expect(String(result)).toBe('/staff/no-access');
  });
});
