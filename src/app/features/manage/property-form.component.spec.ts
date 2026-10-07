import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { PropertyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { PropertyFormComponent } from './property-form.component';
import { of, throwError } from 'rxjs';

describe('Property wizard back navigation', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
    TestBed.configureTestingModule({
      imports: [PropertyFormComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: {
          paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}),
        } } },
        { provide: PropertyManagementApiService, useValue: {} },
        { provide: ReferenceApiService, useValue: { data: signal({
          regions: [], property_types: [], currencies: [], property_amenities: [],
        }) } },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('returns to the previous step from the header without exiting or discarding incomplete input', () => {
    const fixture = TestBed.createComponent(PropertyFormComponent);
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    component.form.patchValue({ title: 'My corrected title', price: '', amenities: ['garden'] }, { emitEvent: false });
    const values = component.form.getRawValue();
    component.step.set(4);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.wizard-nav button') as HTMLButtonElement;
    expect(button.textContent).toContain('Previous: Photos');
    button.click();
    fixture.detectChanges();
    expect(component.step()).toBe(3);
    expect(component.form.getRawValue()).toEqual(values);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('returns to the type chooser only from the first step', () => {
    const fixture = TestBed.createComponent(PropertyFormComponent);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.wizard-nav button') as HTMLButtonElement;
    expect(button.textContent).toContain('Back to listing type');
    button.click();
    expect(navigate).toHaveBeenCalledWith(['/account/manage/listings/new']);
  });
});

describe('Property photo uploads', () => {
  let api: any;
  const existing = { id: 'existing', image: '/existing.jpg', caption: '', sort_order: 0, is_cover: true, created_at: '' };
  const uploaded = { id: 'uploaded', image: '/uploaded.jpg', caption: '', sort_order: 1, is_cover: false, created_at: '' };

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
    vi.stubGlobal('URL', class extends URL { static override revokeObjectURL = vi.fn(); });
    api = {
      // This matches the API write serializer: photos are absent from its response.
      update: vi.fn(() => of({ id: 'listing', title: 'My home', status: 'DRAFT' })),
      uploadImage: vi.fn(() => of(uploaded)),
      updateImage: vi.fn((_id: string, imageId: string, body: { sort_order: number }) => of({ ...(imageId === 'existing' ? existing : uploaded), ...body })),
      detail: vi.fn(() => of({ id: 'listing', images: [existing, uploaded], status: 'DRAFT' })),
    };
    TestBed.configureTestingModule({
      imports: [PropertyFormComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) } } },
        { provide: PropertyManagementApiService, useValue: api },
        { provide: ReferenceApiService, useValue: { data: signal({ regions: [], property_types: [], currencies: [], property_amenities: [] }) } },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function create() {
    const fixture = TestBed.createComponent(PropertyFormComponent);
    const component = fixture.componentInstance;
    component.id = 'listing';
    component.listing.set({ id: 'listing', images: [existing], status: 'DRAFT' } as any);
    component.form.patchValue({ title: 'My home', price: '1000' }, { emitEvent: false });
    component.pendingImages.set([{ localId: 'local', file: new File(['photo'], 'front.jpg', { type: 'image/jpeg' }), previewUrl: 'blob:front', status: 'pending' }]);
    component.step.set(3);
    return fixture;
  }

  it('advances after a successful upload when the draft response omits images', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    await component.continue();
    expect(component.step()).toBe(4);
    expect(component.error()).toBe('');
    expect(component.pendingImages()).toEqual([]);
    expect(component.listing()!.images.map(image => image.id)).toEqual(['existing', 'uploaded']);
    expect(api.uploadImage).toHaveBeenCalledTimes(1);
  });

  it('shows only the failed photo and retries it without uploading successful photos again', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.pendingImages.update(images => [...images, { localId: 'bad', file: new File(['bad'], 'kitchen.jpg', { type: 'image/jpeg' }), previewUrl: 'blob:kitchen', status: 'pending' }]);
    api.uploadImage.mockReturnValueOnce(of(uploaded)).mockReturnValueOnce(throwError(() => new Error('Upload rejected')));
    await component.continue();
    fixture.detectChanges();
    expect(component.step()).toBe(3);
    expect(component.pendingImages().map(image => image.file.name)).toEqual(['kitchen.jpg']);
    expect(component.failedImageCount()).toBe(1);
    const failed = fixture.nativeElement.querySelector('.upload-failed');
    expect(failed.textContent).toContain('kitchen.jpg failed to upload');
    expect(failed.querySelector('img').getAttribute('src')).toBe('blob:kitchen');
    const kitchen = { ...uploaded, id: 'kitchen', image: '/kitchen.jpg', sort_order: 2 };
    api.uploadImage.mockReturnValueOnce(of(kitchen));
    api.updateImage.mockImplementation((_id: string, imageId: string, body: { sort_order: number }) => of({ ...(imageId === 'existing' ? existing : imageId === 'kitchen' ? kitchen : uploaded), ...body }));
    api.detail.mockReturnValue(of({ id: 'listing', images: [existing, uploaded, kitchen], status: 'DRAFT' }));
    await component.retryFailedUploads();
    expect(component.step()).toBe(4);
    expect(component.pendingImages()).toEqual([]);
    expect(component.error()).toBe('');
    expect(api.uploadImage).toHaveBeenCalledTimes(3);
    expect(((api.uploadImage.mock.calls[2][1] as FormData).get('image') as File).name).toBe('kitchen.jpg');
  });

  it('reports photo ordering separately and never reuploads successful photos', async () => {
    const component = create().componentInstance;
    api.updateImage.mockReturnValue(throwError(() => new Error('Ordering failed')));
    await component.continue();
    expect(component.step()).toBe(3);
    expect(component.error()).toBe('Photo order could not be saved.');
    expect(component.failedImageCount()).toBe(0);
    expect(component.pendingImages()).toEqual([]);
    api.updateImage.mockImplementation((_id: string, imageId: string, body: { sort_order: number }) => of({ ...(imageId === 'existing' ? existing : uploaded), ...body }));
    await component.continue();
    expect(component.step()).toBe(4);
    expect(api.uploadImage).toHaveBeenCalledTimes(1);
  });

  it.each([true, false])('saves the creator availability choice (%s) before submission', async (available) => {
    const component = create().componentInstance;
    component.pendingImages.set([]);
    component.form.patchValue({ description: 'A home description', region: 'Hhohho', town: 'Mbabane',
      latitude: '-26', longitude: '31', confirmed: true, available }, { emitEvent: false });
    const saved = { id: 'listing', images: [existing], status: 'DRAFT' };
    api.confirmAvailability = vi.fn(() => of(saved));
    api.markUnavailable = vi.fn(() => of(saved));
    api.submit = vi.fn(() => of({ ...saved, status: 'SUBMITTED' }));
    await component.submit();
    expect(available ? api.confirmAvailability : api.markUnavailable).toHaveBeenCalledWith('listing');
    expect(available ? api.markUnavailable : api.confirmAvailability).not.toHaveBeenCalled();
    expect(api.submit).toHaveBeenCalledWith('listing');
    expect(component.submitted()).toBe(true);
  });
});
