import { signal } from '@angular/core';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ReferenceData } from '../../core/models/api.models';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  RoomManagementApiService,
  StayManagementApiService,
} from '../../core/api/manage-api.services';
import { ToastService } from '../../core/services/toast.service';
import { StayImage, RoomTypeSummary } from '../../core/models/listing.models';
import { RoomsComponent } from './rooms.component';

describe('RoomsComponent', () => {
  const firstRoom: RoomTypeSummary = {
    id: 'room-1',
    name: 'Garden Room',
    slug: 'garden-room',
    description: 'A calm room.',
    capacity_adults: 2,
    capacity_children: 0,
    total_capacity: 2,
    number_of_beds: 1,
    bed_configuration: 'Queen bed',
    bathroom_type: 'PRIVATE',
    quantity: 1,
    base_price: '850.00',
    currency: 'SZL',
    minimum_stay: 1,
    is_active: true,
    images: [],
    created_at: '',
    updated_at: '',
  };
  const secondRoom: RoomTypeSummary = {
    ...firstRoom,
    id: 'room-2',
    name: 'Family Room',
    slug: 'family-room',
    capacity_adults: 2,
    capacity_children: 2,
    total_capacity: 4,
    base_price: '1200.00',
  };
  let stayApi: {
    rooms: ReturnType<typeof vi.fn>;
    createRoom: ReturnType<typeof vi.fn>;
  };
  let roomApi: {
    update: ReturnType<typeof vi.fn>;
    uploadImage: ReturnType<typeof vi.fn>;
    updateImage: ReturnType<typeof vi.fn>;
    deleteImage: ReturnType<typeof vi.fn>;
  };
  const choiceData = {
    bed_configurations: [
      { value: 'QUEEN', label: 'Queen bed' },
      { value: 'QUEEN_TWIN', label: 'Queen and twin beds' },
    ],
    bathroom_types: [{ value: 'PRIVATE', label: 'Private bathroom' }],
    currencies: [{ value: 'SZL', label: 'Swazi lilangeni' }],
  } as ReferenceData;
  let reference: {
    data: ReturnType<typeof signal<ReferenceData>>;
    load: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };
  let toast: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    reference = {
      data: signal(choiceData),
      load: vi.fn(() => of(choiceData)),
      refresh: vi.fn(() => of(choiceData)),
    };
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }),
    );
    stayApi = {
      rooms: vi.fn(() => of([firstRoom])),
      createRoom: vi.fn(() => of(secondRoom)),
    };
    roomApi = {
      update: vi.fn(() => of(secondRoom)),
      uploadImage: vi.fn(() => of({})),
      updateImage: vi.fn(() => of({})),
      deleteImage: vi.fn(() => of(undefined)),
    };
    toast = { show: vi.fn() };
    TestBed.configureTestingModule({
      imports: [RoomsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: 'stay-1' }) } },
        },
        { provide: StayManagementApiService, useValue: stayApi },
        { provide: RoomManagementApiService, useValue: roomApi },
        { provide: ToastService, useValue: toast },
        { provide: ReferenceApiService, useValue: reference },
      ],
    });
  });

  function createFixture() {
    const fixture = TestBed.createComponent(RoomsComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fillValidRoom(component: RoomsComponent) {
    component.form.patchValue({
      name: 'Family Room',
      description: 'A larger room.',
      capacity_adults: 2,
      capacity_children: 2,
      total_capacity: 4,
      number_of_beds: 2,
      bed_configuration: 'QUEEN_TWIN',
      bathroom_type: 'PRIVATE',
      quantity: 3,
      base_price: '1200',
      currency: 'szl',
      minimum_stay: 2,
      is_active: true,
    });
  }

  it('marks invalid fields and does not submit when Add Room is clicked with an invalid form', async () => {
    const fixture = createFixture();

    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(stayApi.createRoom).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.name.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Please correct the highlighted room details',
    );
    expect(fixture.nativeElement.textContent).toContain('Room name is required');
  });

  it('submits one normalized payload to the stay room endpoint', async () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidRoom(component);

    await component.save();

    expect(stayApi.createRoom).toHaveBeenCalledWith('stay-1', {
      name: 'Family Room',
      description: 'A larger room.',
      capacity_adults: 2,
      capacity_children: 2,
      total_capacity: 4,
      number_of_beds: 2,
      bed_configuration: 'QUEEN_TWIN',
      bathroom_type: 'PRIVATE',
      quantity: 3,
      base_price: '1200',
      currency: 'SZL',
      minimum_stay: 2,
      is_active: true,
    });
  });

  it('calculates total capacity from adults and children', async () => {
    const fixture = createFixture();
    const form = fixture.componentInstance.form;

    form.controls.capacity_adults.setValue(3);
    form.controls.capacity_children.setValue(2);

    expect(form.controls.total_capacity.value).toBe(5);
  });

  it('serializes quantity as the number of rooms available', async () => {
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    await fixture.componentInstance.save();

    expect(stayApi.createRoom).toHaveBeenCalledWith(
      'stay-1',
      expect.objectContaining({ quantity: 3, total_capacity: 4 }),
    );
  });

  it('prevents duplicate submits while a request is pending', async () => {
    const pending = new Subject<RoomTypeSummary>();
    stayApi.createRoom.mockReturnValue(pending);
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    void fixture.componentInstance.save();
    void fixture.componentInstance.save();

    expect(stayApi.createRoom).toHaveBeenCalledTimes(1);
  });

  it('adds the created room to the UI immediately after success', async () => {
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.componentInstance.rooms()).toEqual([firstRoom, secondRoom]);
    expect(fixture.nativeElement.textContent).toContain('Family Room');
    expect(toast.show).toHaveBeenCalledWith('Room type added.', 'success');
  });

  it('updates an edited room immutably after success', async () => {
    const updated = { ...firstRoom, name: 'Updated Garden Room' };
    roomApi.update.mockReturnValue(of(updated));
    const fixture = createFixture();

    fixture.componentInstance.edit(firstRoom);
    fixture.componentInstance.form.controls.name.setValue('Updated Garden Room');
    await fixture.componentInstance.save();

    expect(roomApi.update).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({ name: 'Updated Garden Room' }),
    );
    expect(fixture.componentInstance.rooms()).toEqual([updated]);
  });

  it('surfaces backend field errors inline and as a toast', async () => {
    stayApi.createRoom.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              message: 'Please correct the highlighted room details.',
              errors: { total_capacity: ['Must cover adult and child capacities.'] },
            },
          }),
      ),
    );
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Must cover adult and child capacities.');
    expect(toast.show).toHaveBeenCalledWith('Please fix the highlighted fields.', 'error');
  });

  it('adds multiple rooms without replacing previous rooms', async () => {
    const thirdRoom = { ...secondRoom, id: 'room-3', name: 'Executive Room' };
    stayApi.createRoom.mockReturnValueOnce(of(secondRoom)).mockReturnValueOnce(of(thirdRoom));
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    await fixture.componentInstance.save();
    fillValidRoom(fixture.componentInstance);
    fixture.componentInstance.form.controls.name.setValue('Executive Room');
    await fixture.componentInstance.save();

    expect(fixture.componentInstance.rooms().map((room) => room.id)).toEqual([
      'room-1',
      'room-2',
      'room-3',
    ]);
  });

  it('requires a persisted stay id before room creation', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RoomsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: StayManagementApiService, useValue: stayApi },
        { provide: RoomManagementApiService, useValue: roomApi },
        { provide: ToastService, useValue: toast },
        { provide: ReferenceApiService, useValue: reference },
      ],
    });
    const fixture = TestBed.createComponent(RoomsComponent);
    fixture.detectChanges();
    fillValidRoom(fixture.componentInstance);

    await fixture.componentInstance.save();

    expect(stayApi.createRoom).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formError()).toBe('Save the stay before adding rooms.');
  });
  it('saves the room before uploads, keeps partial failures, and retries without creating another room', async () => {
    const fixture = createFixture();
    const c = fixture.componentInstance;
    fillValidRoom(c);
    const created = new Subject<RoomTypeSummary>();
    stayApi.createRoom.mockReturnValue(created);
    const photo = {
      id: 'photo-1',
      image: '/persisted.jpg',
      is_cover: true,
      sort_order: 0,
      caption: '',
      created_at: '',
    };
    roomApi.uploadImage
      .mockReturnValueOnce(of(photo))
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));
    c.selectPhotos([
      new File(['one'], 'one.jpg', { type: 'image/jpeg' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
    ]);
    expect(c.photos().map((p) => p.state)).toEqual(['PREPARING', 'PREPARING']);
    const saved = c.save();
    expect(roomApi.uploadImage).not.toHaveBeenCalled();
    created.next(secondRoom);
    created.complete();
    await saved;
    expect(roomApi.uploadImage.mock.calls[0][0]).toBe('room-2');
    expect(roomApi.uploadImage.mock.calls[0][1].get('image').name).toBe('one.jpg');
    expect(c.cover(c.rooms()[1])).toBe('/persisted.jpg');
    expect(c.photos().map((p) => p.state)).toEqual(['UPLOADED', 'FAILED']);
    expect(c.photoSummary()).toContain('1 failed');
    roomApi.uploadImage.mockReturnValue(
      of({ ...photo, id: 'photo-2', is_cover: false, sort_order: 1 }),
    );
    await c.retryPhoto(c.photos()[1]);
    expect(c.photos().every((p) => p.state === 'UPLOADED')).toBe(true);
    expect(stayApi.createRoom).toHaveBeenCalledTimes(1);
    expect(c.rooms()[1].images).toHaveLength(2);
  });

  it('shows uploading until the backend persists a photo', async () => {
    const c = createFixture().componentInstance;
    fillValidRoom(c);
    const uploaded = new Subject<any>();
    roomApi.uploadImage.mockReturnValue(uploaded);
    c.selectPhotos([new File(['one'], 'one.jpg', { type: 'image/jpeg' })]);
    const saved = c.save();
    await Promise.resolve();
    expect(c.photos()[0].state).toBe('UPLOADING');
    expect(c.busy()).toBe(true);
    uploaded.next({ id: 'image', image: '/photo.jpg', is_cover: true, sort_order: 0 });
    uploaded.complete();
    await saved;
    expect(c.photos()).toEqual([]);
    expect(c.cover(c.rooms()[1])).toBe('/photo.jpg');
  });

  it('loads existing photos for editing and preserves them when the write response omits images', async () => {
    const c = createFixture().componentInstance;
    const image = {
      id: 'photo',
      image: '/existing.jpg',
      is_cover: true,
      sort_order: 0,
      caption: '',
      created_at: '',
    };
    const room = { ...firstRoom, images: [image] };
    c.edit(room);
    expect(c.photos()[0].image).toEqual(image);
    roomApi.update.mockReturnValue(of({ ...firstRoom, images: undefined, name: 'Edited' }));
    await c.save();
    expect(c.rooms()[0].images).toEqual([image]);
  });

  it('only removes persisted images after delete succeeds and reloads the fallback cover', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const image = {
      id: 'photo',
      image: '/existing.jpg',
      is_cover: true,
      sort_order: 0,
      caption: '',
      created_at: '',
    };
    const room = { ...firstRoom, images: [image] };
    stayApi.rooms.mockReturnValue(of([room]));
    const c = createFixture().componentInstance;
    c.edit(room);
    const deleted = new Subject<void>();
    roomApi.deleteImage.mockReturnValue(deleted);
    c.removePhoto(c.photos()[0]);
    expect(c.photos()).toHaveLength(1);
    stayApi.rooms.mockReturnValue(of([firstRoom]));
    deleted.next();
    deleted.complete();
    expect(c.photos()).toHaveLength(0);
  });

  it('rejects unsupported files without making a request', async () => {
    const c = createFixture().componentInstance;
    c.selectPhotos([new File(['text'], 'note.txt', { type: 'text/plain' })]);
    expect(c.photos()).toHaveLength(0);
    expect(c.photoSummary()).toContain('Unsupported image type');
    expect(roomApi.uploadImage).not.toHaveBeenCalled();
  });
  it('does not bubble the room form submit into the stay wizard', () => {
    const fixture = createFixture();
    const form = fixture.nativeElement.querySelector('form');
    const parentSubmit = vi.fn();
    form.parentElement.addEventListener('submit', parentSubmit);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(parentSubmit).not.toHaveBeenCalled();
  });

  it('normalizes persisted ordering when moving photos with gapped sort values', () => {
    const c = createFixture().componentInstance;
    const images = [5, 10, 15].map((sort_order, index) => ({
      id: String(index),
      image: '/photo.jpg',
      sort_order,
      is_cover: index === 0,
      caption: '',
      created_at: '',
    }));
    c.moveImage({ ...firstRoom, images }, images[2], -1);
    expect(roomApi.updateImage.mock.calls.map((call) => [call[1], call[2].sort_order])).toEqual([
      ['0', 0],
      ['2', 1],
      ['1', 2],
    ]);
  });
  it('renders the form above created rooms and displays backend labels while submitting their values', async () => {
    const f = createFixture();
    const c = f.componentInstance;
    const form = f.nativeElement.querySelector('.room-form');
    const list = f.nativeElement.querySelector('.room-list-panel');
    expect(form.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      f.nativeElement.querySelector('select[formControlName="bed_configuration"]').textContent,
    ).toContain('Queen bed');
    expect(
      f.nativeElement.querySelector('select[formControlName="bathroom_type"]').textContent,
    ).toContain('Private bathroom');
    fillValidRoom(c);
    await c.save();
    expect(stayApi.createRoom).toHaveBeenCalledWith(
      'stay-1',
      expect.objectContaining({ bed_configuration: 'QUEEN_TWIN', bathroom_type: 'PRIVATE' }),
    );
  });

  it('disables loading options and offers retry when choices fail', () => {
    const pending = new Subject<ReferenceData>();
    reference.load.mockReturnValue(pending);
    const f = createFixture();
    expect(f.componentInstance.optionsLoading()).toBe(true);
    expect(f.nativeElement.textContent).toContain('Loading options');
    pending.error(new Error('Unavailable'));
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Could not load room options');
    f.componentInstance.loadOptions(true);
    f.detectChanges();
    expect(reference.refresh).toHaveBeenCalledTimes(1);
    expect(f.componentInstance.optionsError()).toBe(false);
  });

  it('populates Edit and focuses the top form; Manage photos focuses its file chooser', () => {
    const f = createFixture();
    const c = f.componentInstance;
    const form = f.nativeElement.querySelector('.room-form');
    form.scrollIntoView = vi.fn();
    const photos = f.nativeElement.querySelector('.room-photos');
    photos.scrollIntoView = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    c.edit(firstRoom);
    expect(form.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    expect(document.activeElement).toBe(form.querySelector('input[formControlName="name"]'));
    expect(c.form.controls.name.value).toBe(firstRoom.name);
    c.managePhotos(firstRoom);
    expect(photos.scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement).toBe(photos.querySelector('input[type="file"]'));
    expect(reference.load).toHaveBeenCalledTimes(1);
    c.cancel();
    expect(c.editing()).toBeNull();
    expect(c.rooms()).toEqual([firstRoom]);
  });

  it('shows immediate dropped previews and an upload spinner until persistence', async () => {
    const f = createFixture();
    const c = f.componentInstance;
    fillValidRoom(c);
    const file = new File(['photo'], 'room.jpg', { type: 'image/jpeg' });
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [file] } });
    f.nativeElement.querySelector('.photo-drop').dispatchEvent(event);
    f.detectChanges();
    expect(f.nativeElement.querySelector('.photo-preview img').getAttribute('src')).toBe(
      'blob:photo',
    );
    const uploaded = new Subject<StayImage>();
    roomApi.uploadImage.mockReturnValue(uploaded);
    const saved = c.save();
    await Promise.resolve();
    f.detectChanges();
    expect(f.nativeElement.querySelector('.upload-overlay')).toBeTruthy();
    uploaded.next({
      id: 'photo',
      image: '/room.jpg',
      sort_order: 0,
      is_cover: true,
      caption: '',
      created_at: '',
    });
    uploaded.complete();
    await saved;
    expect(c.cover(c.rooms()[1])).toBe('/room.jpg');
  });
});
