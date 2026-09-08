import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationItemComponent, StatusBadgeComponent } from './account-ui';

describe('account ui', () => {
  it('renders workflow status text', () => {
    const f = TestBed.configureTestingModule({ imports: [StatusBadgeComponent] }).createComponent(StatusBadgeComponent);
    f.componentRef.setInput('status', 'RESCHEDULE_REQUESTED');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Reschedule Requested');
  });

  it('uses safe notification navigation metadata', () => {
    const f = TestBed.configureTestingModule({
      imports: [NotificationItemComponent],
      providers: [provideRouter([])],
    }).createComponent(NotificationItemComponent);
    f.componentRef.setInput('item', {
      id: 'n1',
      notification_type: 'NEW_MESSAGE',
      title: 'Message',
      message: 'Hello',
      data: { conversation_id: 'c1', route: 'https://bad.example' },
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
      expires_at: null,
    });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Message');
    expect(f.componentInstance.route()).toEqual(['/account/messages', 'c1']);
  });
});
