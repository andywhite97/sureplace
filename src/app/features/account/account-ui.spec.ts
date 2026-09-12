import { TestBed } from '@angular/core/testing';
import { NotificationItemComponent, StatusBadgeComponent } from './account-ui';
import { NotificationNavigationService } from '../../core/services/notification-navigation.service';

describe('account ui', () => {
  it('renders workflow status text', () => {
    const f = TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).createComponent(
      StatusBadgeComponent,
    );
    f.componentRef.setInput('status', 'RESCHEDULE_REQUESTED');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Reschedule Requested');
  });

  it('uses safe notification navigation metadata', () => {
    const navigation = { label: vi.fn(() => 'View listing'), open: vi.fn() };
    const f = TestBed.configureTestingModule({
      imports: [NotificationItemComponent],
      providers: [{ provide: NotificationNavigationService, useValue: navigation }],
    }).createComponent(NotificationItemComponent);
    f.componentRef.setInput('item', {
      id: 'n1',
      notification_type: 'LISTING_STATUS_UPDATE',
      title: 'Listing approved',
      message: 'Approved',
      data: {},
      action: { label: 'View listing', url: '/properties/approved-home' },
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      expires_at: null,
    });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Listing approved');
    expect(f.nativeElement.textContent).toContain('View listing');
    f.nativeElement.querySelector('button').click();
    expect(navigation.open).toHaveBeenCalled();
  });
});
