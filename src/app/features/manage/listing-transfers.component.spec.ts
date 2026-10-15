import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ApiClient } from '../../core/api/api-client';
import { ListingTransfersComponent } from './listing-transfers.component';

describe('ListingTransfersComponent', () => {
  let api: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
  const incoming = { id: 'request-1', listing_title: 'Mountain home', sender: 'owner@example.com', recipient: 'New owner', status: 'PENDING', can_receive: true, can_cancel: false, expires_at: '2026-10-22T12:00:00Z' };
  beforeEach(() => {
    api = {
      get: vi.fn((path: string) => of(path.endsWith('options/') ? { listings: [{ id: 'listing-1', kind: 'property', title: 'Mountain home', public_id: 'SP-1' }], agencies: [] } : [incoming])),
      post: vi.fn(() => of({})),
    };
    TestBed.configureTestingModule({ imports: [ListingTransfersComponent], providers: [provideRouter([]), { provide: ApiClient, useValue: api }] });
  });
  it('requires explicit confirmation before sending ownership', () => {
    const fixture = TestBed.createComponent(ListingTransfersComponent);
    const component = fixture.componentInstance;
    component.listingKey = 'property:listing-1'; component.email = 'new@example.com';
    component.send();
    expect(api.post).not.toHaveBeenCalled();
    component.acknowledged = true;
    component.send();
    expect(api.post).toHaveBeenCalledWith('/listing-transfers/', { kind: 'property', listing_id: 'listing-1', email: 'new@example.com' });
    expect(component.notice()).toContain('after acceptance');
  });
  it('asks for confirmation before accepting and displays only recipient actions', () => {
    const fixture = TestBed.createComponent(ListingTransfersComponent);
    fixture.detectChanges();
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    buttons.find(button => button.textContent?.trim() === 'Accept transfer')!.click();
    fixture.detectChanges();
    expect(api.post).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Confirm acceptance');
    expect(fixture.nativeElement.textContent).not.toContain('Cancel request');
    const confirm = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]).find(button => button.textContent?.trim() === 'Confirm acceptance')!;
    confirm.click();
    expect(api.post).toHaveBeenCalledWith('/listing-transfers/request-1/', { action: 'accept' });
  });
  it('keeps a failed transfer reviewable and prevents duplicate sends', () => {
    const fixture = TestBed.createComponent(ListingTransfersComponent);
    const component = fixture.componentInstance;
    const pending = new Subject<{}>();
    api.post.mockReturnValue(pending);
    component.listingKey = 'property:listing-1'; component.email = 'new@example.com'; component.acknowledged = true;
    component.send(); component.send();
    expect(api.post).toHaveBeenCalledTimes(1);
    pending.error({ error: ['Recipient capacity reached.'] });
    expect(component.busy()).toBe(false);
    expect(component.error()).toContain('capacity');
    expect(component.acknowledged).toBe(true);
    expect(component.transfers().length).toBe(1);
  });
  it('shows load errors with a retry action', () => {
    api.get.mockReturnValue(throwError(() => ({ error: 'Unavailable' })));
    const fixture = TestBed.createComponent(ListingTransfersComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Unavailable');
    expect(fixture.componentInstance.loading()).toBe(false);
  });
});
