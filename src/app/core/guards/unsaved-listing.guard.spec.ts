import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { unsavedListingGuard, EditableListing } from './unsaved-listing.guard';
describe('Unsaved listing navigation', () => {
  const confirm = vi.fn();
  const run = (overrides: Partial<EditableListing> = {}) => TestBed.runInInjectionContext(() => unsavedListingGuard(
    { dirty: () => false, saveState: () => 'saved', ...overrides }, {} as never, {} as never, {} as never,
  ));
  beforeEach(() => { confirm.mockReset(); TestBed.configureTestingModule({ providers: [{ provide: DOCUMENT, useValue: { defaultView: { confirm } } }] }); });
  it('allows saved drafts without prompting', () => { expect(run()).toBe(true); expect(confirm).not.toHaveBeenCalled(); });
  it('keeps dirty drafts on screen when leaving is cancelled', () => { confirm.mockReturnValue(false); expect(run({ dirty: () => true })).toBe(false); });
  it('protects pending photos and saves in progress', () => {
    confirm.mockReturnValue(false);
    expect(run({ pendingImages: () => [{}] })).toBe(false);
    expect(run({ saveState: () => 'saving' })).toBe(false);
  });
  it('allows the successful submission destination', () => { expect(run({ submitted: () => true, saveState: () => 'unsaved' })).toBe(true); });
});
