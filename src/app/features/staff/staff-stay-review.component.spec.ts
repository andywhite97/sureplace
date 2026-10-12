import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { StaffStay } from '../../core/models/staff-stay.models';
import { LeafletLoaderService } from '../../shared/map/leaflet-loader.service';
import { StaffStayReviewComponent } from './staff-stay-review.component';
import { StaffStayGalleryComponent } from './staff-stay-gallery.component';
import { installNativeDialogStubs } from './staff-dialog.test-support';

const stay = {
  id: 's1',
  name: 'Review Lodge',
  public_id: 'SP-1',
  status: 'SUBMITTED',
  status_label: 'Submitted',
  verification_status: 'UNVERIFIED',
  owner: {
    first_name: 'Host',
    last_name: 'Owner',
    email: 'host@example.com',
    is_email_verified: true,
  },
  images: [],
  room_types: [],
  amenities: [],
  audit_events: [],
  reports: [],
  latitude: null,
  longitude: null,
  verification_requests: [{ id: 'v1', status: 'SUBMITTED' }],
} as unknown as StaffStay;
function setup(permissions: string[] = []) {
  TestBed.configureTestingModule({
    imports: [StaffStayReviewComponent],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { user: signal({ staff_permissions: permissions }) } },
      { provide: LeafletLoaderService, useValue: { load: () => Promise.resolve(null) } },
    ],
  });
  const fixture = TestBed.createComponent(StaffStayReviewComponent);
  fixture.componentRef.setInput('stay', stay);
  fixture.detectChanges();
  return fixture;
}
describe('Staff stay review', () => {
  beforeEach(installNativeDialogStubs);
  it('keeps host email, stay verification and moderation states separate', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Unverified');
    expect(fixture.nativeElement.textContent).toContain('Verified');
    expect(fixture.nativeElement.textContent).toContain('Submitted');
    expect(fixture.nativeElement.textContent).toContain('Evidence access requires');
  });
  it('hides decision actions from staff with no corresponding permission', () => {
    const fixture = setup(['stays.review_stay']);
    expect(fixture.nativeElement.querySelector('.action-bar .approve')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Start review');
  });
  it('confirms approval for the selected stay before emitting an API action', () => {
    const fixture = setup(['stays.approve_stay']);
    const spy = vi.fn();
    fixture.componentInstance.action.subscribe(spy);
    fixture.componentInstance.open('approve');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('dialog[aria-labelledby="stay-decision-title"]').open,
    ).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    fixture.componentInstance.submit();
    expect(spy).toHaveBeenCalledWith({ action: 'approve', reason: '' });
  });
  it('requires a rejection reason, blocks duplicate submissions and keeps the dialog open on backend error', () => {
    const fixture = setup(['stays.reject_stay']);
    const spy = vi.fn();
    fixture.componentInstance.action.subscribe(spy);
    fixture.componentInstance.open('reject');
    fixture.componentInstance.submit();
    expect(spy).not.toHaveBeenCalled();
    fixture.componentInstance.reason = 'Missing room information';
    fixture.componentRef.setInput('busy', true);
    fixture.detectChanges();
    fixture.componentInstance.submit();
    expect(spy).not.toHaveBeenCalled();
    fixture.componentRef.setInput('busy', false);
    fixture.componentRef.setInput('error', 'Room invalid');
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('dialog[aria-labelledby="stay-decision-title"]').open,
    ).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Room invalid',
    );
    fixture.componentInstance.submit();
    expect(spy).toHaveBeenCalledWith({ action: 'reject', reason: 'Missing room information' });
  });
  it('links authorized evidence reviews and supports semantic keyboard tabs', () => {
    const fixture = setup(['verification.review_verificationrequest']);
    fixture.componentRef.setInput('tab', 'verification');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a[href="/staff/verification/v1"]')).toBeTruthy();
    const spy = vi.fn();
    fixture.componentInstance.tabChanged.subscribe(spy);
    fixture.nativeElement
      .querySelector('[role="tab"]')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(spy).toHaveBeenCalledWith('rooms');
  });
  it('renders missing policies and room configuration without invented values', () => {
    const fixture = setup();
    fixture.componentRef.setInput('tab', 'policies');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Not provided');
    fixture.componentRef.setInput('tab', 'rooms');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No active room types');
  });
});
describe('Staff stay gallery', () => {
  beforeEach(installNativeDialogStubs);
  it('selects the cover first, navigates photos and supports an accessible lightbox', () => {
    const fixture = TestBed.createComponent(StaffStayGalleryComponent);
    fixture.componentRef.setInput('images', [
      { id: 'one', image: '/1.jpg', caption: 'One', is_cover: false },
      { id: 'two', image: '/2.jpg', caption: 'Two', is_cover: true },
    ]);
    fixture.detectChanges();
    expect(fixture.componentInstance.active()?.id).toBe('two');
    fixture.componentInstance.move(1);
    expect(fixture.componentInstance.active()?.id).toBe('one');
    fixture.componentInstance.open();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(true);
    fixture.componentInstance.close();
    expect(fixture.nativeElement.querySelector('dialog').open).toBe(false);
  });
});
