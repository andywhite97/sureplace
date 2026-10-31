import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { AuthApiService } from '../../core/auth/auth-api.service';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ResetPasswordComponent } from './reset-password.component';

describe('Recovery experience', () => {
  const api = { requestReset: vi.fn(), confirmReset: vi.fn() };
  beforeEach(() => {
    api.requestReset.mockReset();
    api.confirmReset.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthApiService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap({ uid: 'recipient', token: 'reset-token' }),
            },
          },
        },
      ],
    });
  });
  it('validates before requesting and prevents duplicate reset requests', () => {
    const pending = new Subject<{ detail: string }>();
    api.requestReset.mockReturnValue(pending);
    const f = TestBed.createComponent(ForgotPasswordComponent);
    f.detectChanges();
    f.componentInstance.submit();
    expect(api.requestReset).not.toHaveBeenCalled();
    f.componentInstance.form.setValue({ email: 'person@example.com' });
    f.componentInstance.submit();
    f.componentInstance.submit();
    expect(api.requestReset).toHaveBeenCalledOnce();
    pending.next({ detail: 'Accepted' });
    pending.complete();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Check your inbox');
    expect(f.nativeElement.textContent).toContain('If an account exists');
    expect(f.nativeElement.querySelector('form')).toBeNull();
  });
  it('retains the entered email and shows request failures', () => {
    api.requestReset.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 503, error: { message: 'Please try again later.' } }),
      ),
    );
    const f = TestBed.createComponent(ForgotPasswordComponent);
    f.componentInstance.form.setValue({ email: 'person@example.com' });
    f.componentInstance.submit();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Please try again later',
    );
    expect(f.componentInstance.form.controls.email.value).toBe('person@example.com');
    expect(f.componentInstance.busy()).toBe(false);
  });
  it('preserves reset tokens and prevents duplicate confirmation', () => {
    const pending = new Subject<{ detail: string }>();
    api.confirmReset.mockReturnValue(pending);
    const f = TestBed.createComponent(ResetPasswordComponent);
    f.componentInstance.form.setValue({
      new_password: 'validPassword123',
      confirm_password: 'different',
    });
    f.componentInstance.submit();
    expect(api.confirmReset).not.toHaveBeenCalled();
    f.componentInstance.form.controls.confirm_password.setValue('validPassword123');
    f.componentInstance.submit();
    f.componentInstance.submit();
    expect(api.confirmReset).toHaveBeenCalledOnce();
    expect(api.confirmReset).toHaveBeenCalledWith({
      uid: 'recipient',
      token: 'reset-token',
      new_password: 'validPassword123',
      confirm_password: 'validPassword123',
    });
    pending.next({ detail: 'Complete' });
    pending.complete();
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Your password has been reset');
  });
  it('provides labelled password visibility controls', () => {
    const f = TestBed.createComponent(ResetPasswordComponent);
    f.detectChanges();
    f.nativeElement.querySelector('[aria-label="Show new password"]').click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('#new-password').type).toBe('text');
    expect(f.nativeElement.querySelector('#confirm-password').autocomplete).toBe('new-password');
  });
});
