import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { LoginComponent } from './login.component';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

describe('LoginComponent', () => {
  const staffUser = {
    id: 'staff-1',
    email: 'staff@example.com',
    phone_number: '',
    first_name: 'Staff',
    last_name: 'Member',
    avatar: null,
    is_email_verified: true,
    is_phone_verified: false,
    is_staff: true,
    onboarding_intents: [],
  };
  const auth = {
    login: vi.fn(),
    user: signal<User | null>(null),
    isAuthenticated: computed(() => false),
  };
  const toast = { show: vi.fn() };
  const queryParamMap = signal(convertToParamMap({}));

  beforeEach(async () => {
    auth.login.mockReset();
    auth.user.set(null);
    toast.show.mockReset();
    queryParamMap.set(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([
          { path: 'account', component: EmptyComponent },
          { path: 'account/messages', component: EmptyComponent },
          { path: 'staff', component: EmptyComponent },
          { path: 'staff/listings', component: EmptyComponent },
          { path: 'forgot-password', component: EmptyComponent },
          { path: 'register', component: EmptyComponent },
        ]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              get queryParamMap() {
                return queryParamMap();
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fillValid(component: LoginComponent) {
    component.form.patchValue({ email: 'ava@example.com', password: 'secret123', remember: true });
  }

  it('renders the polished single-step login form and auth links', () => {
    const fixture = create();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Welcome back');
    expect(text).toContain('Log in to your SurePlace account.');
    expect(fixture.nativeElement.querySelector('a[href="/forgot-password"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/register"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('What brings you to SurePlace?');
  });

  it('shows inline required and invalid email errors', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Email address is required.');
    expect(fixture.nativeElement.textContent).toContain('Password is required.');

    component.form.patchValue({ email: 'bad', password: 'secret123' });
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
  });

  it('toggles password visibility with an accessible button', () => {
    const fixture = create();
    const button = fixture.nativeElement.querySelector('label button') as HTMLButtonElement;
    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    expect(input.type).toBe('password');
    expect(button.getAttribute('aria-label')).toBe('Show password');
    button.click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#password') as HTMLInputElement).type).toBe(
      'text',
    );
    expect(button.getAttribute('aria-label')).toBe('Hide password');
  });

  it('submits login with remember and prevents duplicate submission', () => {
    auth.login.mockReturnValue(of({ id: 'u1' }));
    const fixture = create();
    const component = fixture.componentInstance;
    fillValid(component);
    component.busy.set(true);
    component.submit();
    expect(auth.login).not.toHaveBeenCalled();

    component.busy.set(false);
    component.submit();
    expect(auth.login).toHaveBeenCalledWith(
      { email: 'ava@example.com', password: 'secret123' },
      true,
    );
  });

  it('shows safe invalid credentials and network errors', () => {
    auth.login.mockReturnValueOnce(
      throwError(
        () => new HttpErrorResponse({ status: 401, error: { code: 'invalid_credentials' } }),
      ),
    );
    const fixture = create();
    const component = fixture.componentInstance;
    fillValid(component);
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'The email or password you entered is incorrect.',
    );

    auth.login.mockReturnValueOnce(throwError(() => new Error('offline')));
    component.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      "We couldn't sign you in right now. Please try again.",
    );
  });

  it('restores a safe return URL on successful login', () => {
    queryParamMap.set(convertToParamMap({ returnUrl: '/account/messages' }));
    auth.login.mockReturnValue(of({ id: 'u1' }));
    const fixture = create();
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fillValid(component);
    component.submit();

    expect(navigate).toHaveBeenCalledWith('/account/messages');
    expect(toast.show).toHaveBeenCalledWith('Welcome back.', 'success');
  });

  it('sends staff users to the staff console after a normal login', () => {
    auth.user.set(staffUser);
    auth.login.mockReturnValue(of(staffUser));
    const fixture = create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fillValid(fixture.componentInstance);
    fixture.componentInstance.submit();

    expect(navigate).toHaveBeenCalledWith('/staff');
  });

  it('preserves a specific safe staff return URL', () => {
    queryParamMap.set(convertToParamMap({ returnUrl: '/staff/listings' }));
    auth.user.set(staffUser);
    auth.login.mockReturnValue(of(staffUser));
    const fixture = create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fillValid(fixture.componentInstance);
    fixture.componentInstance.submit();

    expect(navigate).toHaveBeenCalledWith('/staff/listings');
  });

  it('falls back to account for unsafe return URLs', () => {
    queryParamMap.set(convertToParamMap({ returnUrl: '//evil.example' }));
    auth.login.mockReturnValue(of({ id: 'u1' }));
    const fixture = create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fillValid(fixture.componentInstance);
    fixture.componentInstance.submit();

    expect(navigate).toHaveBeenCalledWith('/account');
  });

  it('falls back to staff for unsafe return URLs when the user is staff', () => {
    queryParamMap.set(convertToParamMap({ returnUrl: '//evil.example' }));
    auth.user.set(staffUser);
    auth.login.mockReturnValue(of(staffUser));
    const fixture = create();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    fillValid(fixture.componentInstance);
    fixture.componentInstance.submit();

    expect(navigate).toHaveBeenCalledWith('/staff');
  });
});
