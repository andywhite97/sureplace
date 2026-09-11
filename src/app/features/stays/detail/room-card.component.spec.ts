import { TestBed } from '@angular/core/testing';
import { RoomCardComponent } from './room-card.component';
import { RoomTypeSummary } from '../../../core/models/listing.models';
describe('RoomCardComponent', () => {
  const room: RoomTypeSummary = {
    id: 'r1',
    name: 'Garden Room',
    slug: 'garden',
    description: 'A quiet room',
    capacity_adults: 2,
    capacity_children: 1,
    total_capacity: 3,
    number_of_beds: 2,
    bed_configuration: 'Queen + single',
    bathroom_type: 'Private bathroom',
    quantity: 2,
    base_price: '850.00',
    currency: 'SZL',
    minimum_stay: 1,
    is_active: true,
    images: [],
    created_at: '',
    updated_at: '',
  };
  it('renders room details and base price without dates', () => {
    const f = TestBed.configureTestingModule({ imports: [RoomCardComponent] }).createComponent(
      RoomCardComponent,
    );
    f.componentRef.setInput('room', room);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Garden Room');
    expect(f.nativeElement.textContent).toContain('From E850');
    expect(f.nativeElement.textContent).toContain('Choose dates');
  });
  it('disables unavailable rooms', () => {
    const f = TestBed.configureTestingModule({ imports: [RoomCardComponent] }).createComponent(
      RoomCardComponent,
    );
    f.componentRef.setInput('room', room);
    f.componentRef.setInput('availability', {
      available: false,
      room_type_id: 'r1',
      rooms_available: 0,
      nightly_prices: [],
      total: '0.00',
    });
    f.detectChanges();
    expect(f.nativeElement.querySelector('button').disabled).toBe(true);
    expect(f.nativeElement.textContent).toContain('Sold out for selected dates');
  });
});
