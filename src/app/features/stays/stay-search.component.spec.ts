import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StaySearchComponent } from './stay-search.component';
import { StaysApiService } from '../../core/api/stays-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ConfigApiService } from '../../core/api/config-api.service';
import { SeoService } from '../../core/services/seo.service';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';

describe('Stay filter modal', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [StaySearchComponent], providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ town: 'Ezulwini', view: 'list' })) } },
      { provide: StaysApiService, useValue: { search: vi.fn(() => of({ count: 0, results: [], next: null, previous: null })) } },
      { provide: ReferenceApiService, useValue: { data: signal({ regions: [{ value: 'HHOHHO', label: 'Hhohho', areas: ['Ezulwini', 'Mbabane'] }], stay_types: [], stay_amenities: [] }) } },
      { provide: ConfigApiService, useValue: { config: signal({ map: { default_latitude: -26.5, default_longitude: 31.4, default_zoom: 8 } }) } },
      { provide: SeoService, useValue: { apply: vi.fn(), absoluteUrl: (path: string) => `http://localhost:4200${path}` } },
      { provide: AuthService, useValue: { isAuthenticated: signal(false) } },
      { provide: ToastService, useValue: { show: vi.fn() } },
    ],
  }));
  function create() {
    const fixture = TestBed.createComponent(StaySearchComponent);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const open = vi.fn(() => dialog.setAttribute('open', ''));
    const close = vi.fn(() => dialog.removeAttribute('open'));
    Object.defineProperty(dialog, 'showModal', { value: open });
    Object.defineProperty(dialog, 'close', { value: close });
    return { fixture, dialog, open, close };
  }
  it('keeps only Filters and List/Map visible and applies the modal values', () => {
    const { fixture, dialog, open, close } = create();
    expect(fixture.nativeElement.querySelector('.toolbar input')).toBeNull();
    expect(fixture.nativeElement.querySelector('.toolbar select')).toBeNull();
    fixture.nativeElement.querySelector('.stay-filter-trigger').click();
    expect(open).toHaveBeenCalled();
    expect(dialog.querySelector('[formControlName="check_in"]')).not.toBeNull();
    expect(dialog.querySelector('[formControlName="adults"]')).not.toBeNull();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
    fixture.componentInstance.form.patchValue({ destination: 'Mbabane', town: '', check_in: day(2), check_out: day(4), adults: 3, rooms: 2, ordering: 'price_asc' });
    fixture.componentInstance.apply();
    expect(navigate).toHaveBeenCalledWith(['/stays'], { queryParams: expect.objectContaining({ town: 'Mbabane', adults: 3, rooms: 2, ordering: 'price_asc' }) });
    expect(fixture.componentInstance.state().view).toBe('list');
    expect(close).toHaveBeenCalled();
    fixture.nativeElement.querySelector('.stay-view-toggle button:last-child').click();
    expect(navigate).toHaveBeenLastCalledWith(['/stays'], { queryParams: expect.objectContaining({ town: 'Ezulwini', view: 'map' }) });
  });
  it('keeps the modal open for invalid dates and discards changes when cancelled', () => {
    const { fixture, dialog, close } = create();
    fixture.componentInstance.openFilters();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.form.patchValue({ town: 'Mbabane', check_in: '2020-01-01', check_out: '2020-01-02' });
    fixture.componentInstance.apply();
    expect(fixture.componentInstance.dateError()).toBeTruthy();
    expect(fixture.componentInstance.filtersOpen()).toBe(true);
    navigate.mockClear();
    dialog.dispatchEvent(new Event('cancel'));
    expect(close).toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.town.value).toBe('Ezulwini');
    expect(fixture.componentInstance.form.controls.check_in.value).toBe('');
    expect(fixture.componentInstance.filtersOpen()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});
