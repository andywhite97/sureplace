import { TestBed } from '@angular/core/testing';
import { ToastService } from '../core/services/toast.service';
import { ToastRegionComponent } from './toast-region.component';

describe('ToastRegionComponent', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ToastRegionComponent] });
    service = TestBed.inject(ToastService);
    service.items.set([]);
  });

  it('renders stacked success and error toasts with dismiss actions', () => {
    service.show({ kind: 'success', title: 'Success!', message: 'Your property has been saved.', persistent: true });
    service.show({ kind: 'error', title: 'Something went wrong', message: "We couldn't save your changes.", persistent: true });
    const fixture = TestBed.createComponent(ToastRegionComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.toast').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.success .fa-circle-check')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.error .fa-circle-exclamation')).toBeTruthy();

    fixture.nativeElement.querySelector('.dismiss').click();
    fixture.detectChanges();
    expect(service.items().length).toBe(1);
  });

  it('runs action toast callbacks from a compact action button', () => {
    const run = vi.fn();
    service.show({ kind: 'action', title: 'Ready to go!', message: 'Your account has been created.', action: { label: 'Go to account', run }, persistent: true });
    const fixture = TestBed.createComponent(ToastRegionComponent);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.action .toast-action').click();
    fixture.detectChanges();

    expect(run).toHaveBeenCalled();
    expect(service.items()).toEqual([]);
  });

  it('uses bottom-right desktop positioning and mobile bottom offset', () => {
    const styles = ((ToastRegionComponent as unknown as { [key: string]: { styles: string[] } })['\u0275cmp']).styles.join('');
    expect(styles).toMatch(/right:\s*1\.25rem/);
    expect(styles).toMatch(/bottom:\s*1\.25rem/);
    expect(styles).toMatch(/flex-direction:\s*column-reverse/);
    expect(styles).toMatch(/bottom:\s*calc\(78px \+ env\(safe-area-inset-bottom\)\)/);
  });
});
