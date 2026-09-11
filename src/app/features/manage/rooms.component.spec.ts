import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import {
  RoomManagementApiService,
  StayManagementApiService,
} from '../../core/api/manage-api.services';
import { ToastService } from '../../core/services/toast.service';
import { RoomTypeSummary } from '../../core/models/listing.models';
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
    bathroom_type: 'Private',
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
  let toast: { show: ReturnType<typeof vi.fn> };

  beforeEach(() => {
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
      bed_configuration: 'Queen and twin',
      bathroom_type: 'Private',
      quantity: 3,
      base_price: '1200',
      currency: 'szl',
      minimum_stay: 2,
      is_active: true,
    });
  }

  it('marks invalid fields and does not submit when Add Room is clicked with an invalid form', () => {
    const fixture = createFixture();

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(stayApi.createRoom).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.name.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'Please correct the highlighted room details',
    );
    expect(fixture.nativeElement.textContent).toContain('Room name is required');
  });

  it('submits one normalized payload to the stay room endpoint', () => {
    const fixture = createFixture();
    const component = fixture.componentInstance;
    fillValidRoom(component);

    component.save();

    expect(stayApi.createRoom).toHaveBeenCalledWith('stay-1', {
      name: 'Family Room',
      description: 'A larger room.',
      capacity_adults: 2,
      capacity_children: 2,
      total_capacity: 4,
      number_of_beds: 2,
      bed_configuration: 'Queen and twin',
      bathroom_type: 'Private',
      quantity: 3,
      base_price: '1200',
      currency: 'SZL',
      minimum_stay: 2,
      is_active: true,
    });
  });

  it('prevents duplicate submits while a request is pending', () => {
    const pending = new Subject<RoomTypeSummary>();
    stayApi.createRoom.mockReturnValue(pending);
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    fixture.componentInstance.save();
    fixture.componentInstance.save();

    expect(stayApi.createRoom).toHaveBeenCalledTimes(1);
  });

  it('adds the created room to the UI immediately after success', () => {
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.componentInstance.rooms()).toEqual([firstRoom, secondRoom]);
    expect(fixture.nativeElement.textContent).toContain('Family Room');
    expect(toast.show).toHaveBeenCalledWith('Room added successfully.', 'success');
  });

  it('updates an edited room immutably after success', () => {
    const updated = { ...firstRoom, name: 'Updated Garden Room' };
    roomApi.update.mockReturnValue(of(updated));
    const fixture = createFixture();

    fixture.componentInstance.edit(firstRoom);
    fixture.componentInstance.form.controls.name.setValue('Updated Garden Room');
    fixture.componentInstance.save();

    expect(roomApi.update).toHaveBeenCalledWith(
      'room-1',
      expect.objectContaining({ name: 'Updated Garden Room' }),
    );
    expect(fixture.componentInstance.rooms()).toEqual([updated]);
  });

  it('surfaces backend field errors inline and as a toast', () => {
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

    fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Must cover adult and child capacities.');
    expect(toast.show).toHaveBeenCalledWith(
      'Please correct the highlighted room details.',
      'error',
    );
  });

  it('adds multiple rooms without replacing previous rooms', () => {
    const thirdRoom = { ...secondRoom, id: 'room-3', name: 'Executive Room' };
    stayApi.createRoom.mockReturnValueOnce(of(secondRoom)).mockReturnValueOnce(of(thirdRoom));
    const fixture = createFixture();
    fillValidRoom(fixture.componentInstance);

    fixture.componentInstance.save();
    fillValidRoom(fixture.componentInstance);
    fixture.componentInstance.form.controls.name.setValue('Executive Room');
    fixture.componentInstance.save();

    expect(fixture.componentInstance.rooms().map((room) => room.id)).toEqual([
      'room-1',
      'room-2',
      'room-3',
    ]);
  });

  it('requires a persisted stay id before room creation', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RoomsComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: StayManagementApiService, useValue: stayApi },
        { provide: RoomManagementApiService, useValue: roomApi },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(RoomsComponent);
    fixture.detectChanges();
    fillValidRoom(fixture.componentInstance);

    fixture.componentInstance.save();

    expect(stayApi.createRoom).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formError()).toBe('Save the stay before adding rooms.');
  });
});
