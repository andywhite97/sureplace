import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates success, error, warning, info, action and loading toasts', () => {
    service.show('Saved.', 'success');
    service.show('Nope.', 'error');
    service.show('Careful.', 'warning');
    service.show('Heads up.', 'info');
    service.show({ kind: 'action', title: 'Ready', message: 'Open it', action: { label: 'Open', run: vi.fn() } });
    service.show({ kind: 'loading', title: 'Saving...', message: 'Please wait' });

    expect(service.items().map((toast) => toast.kind)).toEqual(['success', 'error', 'warning', 'info', 'action', 'loading']);
    expect(service.items().at(-1)?.persistent).toBe(true);
  });

  it('dismisses normal toasts automatically but leaves loading toasts until dismissed', () => {
    const success = service.show('Saved.', 'success');
    const loading = service.show({ kind: 'loading', title: 'Saving...' });
    vi.advanceTimersByTime(5000);

    expect(service.items().some((toast) => toast.id === success)).toBe(false);
    expect(service.items().some((toast) => toast.id === loading)).toBe(true);

    service.dismiss(loading);
    expect(service.items()).toEqual([]);
  });
});
