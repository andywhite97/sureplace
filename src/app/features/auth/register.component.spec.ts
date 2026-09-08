import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { RegisterComponent } from './register.component';

@Component({ standalone: true, template: '' })
class EmptyComponent {}

describe('RegisterComponent', () => {
  const auth = {
    register: vi.fn(),
    login: vi.fn(),
    user: signal(null),
    isAuthenticated: computed(() => false),
  };
  const toast = { show: vi.fn() };

  beforeEach(async () => {
    auth.register.mockReset();
    auth.login.mockReset();
    toast.show.mockReset();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([
          { path: 'login', component: EmptyComponent },
          { path: 'properties', component: EmptyComponent },
          { path: 'account/manage/stays/new', component: EmptyComponent },
          { path: 'account/manage/properties/new', component: EmptyComponent },
          { path: 'account/manage', component: EmptyComponent },
          { path: 'account', component: EmptyComponent },
        ]),
        { provide: AuthService, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    }).compileComponents();
  });

  function create() {
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    return fixture;
  }

  function accountValid(component: RegisterComponent) {
    component.form.patchValue({ email: 'ava@example.com', password: 'password123', confirm: 'password123' });
  }

  function detailsValid(component: RegisterComponent) {
    component.form.patchValue({ first_name: 'Ava', last_name: 'Dlamini', phone_number: '+26876123456' });
  }

  it('starts on the Account step', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Start with your login details.');
    expect(fixture.nativeElement.textContent).toContain('Already have an account?');
  });

  it('blocks Continue for invalid email and password mismatch', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.form.patchValue({ email: 'bad', password: 'password123', confirm: 'different' });
    component.next();
    fixture.detectChanges();

    expect(component.step()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    expect(fixture.nativeElement.textContent).toContain('Passwords do not match.');
  });

  it('moves through details and intent while preserving state', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    accountValid(component);
    component.next();
    detailsValid(component);
    component.next();
    component.toggle('LOOKING_FOR_PROPERTY');
    component.toggle('PROPERTY_OWNER');
    component.next();
    component.back();
    fixture.detectChanges();

    expect(component.step()).toBe(2);
    expect(component.selected()).toEqual(['LOOKING_FOR_PROPERTY', 'PROPERTY_OWNER']);
    expect(component.form.controls.email.value).toBe('ava@example.com');
  });

  it('shows review values and edit buttons return to the selected step', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    accountValid(component);
    component.next();
    detailsValid(component);
    component.next();
    component.toggle('PROPERTY_AGENT');
    component.next();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('ava@example.com');
    expect(fixture.nativeElement.textContent).toContain('Ava Dlamini');
    expect(fixture.nativeElement.textContent).toContain('List properties as an agent');
    component.edit(1);
    expect(component.step()).toBe(1);
  });

  it('submits the registration payload only from the final step and prevents duplicates', () => {
    auth.register.mockReturnValue(of({ id: 'u1' }));
    auth.login.mockReturnValue(of({ id: 'u1' }));
    const fixture = create();
    const component = fixture.componentInstance;
    accountValid(component);
    detailsValid(component);
    component.toggle('LOOKING_FOR_PROPERTY');
    component.step.set(3);
    component.busy.set(true);
    component.submit();
    expect(auth.register).not.toHaveBeenCalled();

    component.busy.set(false);
    component.submit();
    expect(auth.register).toHaveBeenCalledWith({
      email: 'ava@example.com',
      password: 'password123',
      first_name: 'Ava',
      last_name: 'Dlamini',
      phone_number: '+26876123456',
      onboarding_intents: ['LOOKING_FOR_PROPERTY'],
    });
    expect(auth.login).toHaveBeenCalledWith({ email: 'ava@example.com', password: 'password123' });
  });

  it('maps backend email and phone errors back to their steps', () => {
    auth.register.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400, error: { email: ['Already registered.'] } })));
    const fixture = create();
    const component = fixture.componentInstance;
    accountValid(component);
    detailsValid(component);
    component.toggle('LOOKING_FOR_PROPERTY');
    component.step.set(3);
    component.submit();
    fixture.detectChanges();
    expect(component.step()).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Already registered.');

    auth.register.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 400, error: { phone_number: ['Invalid phone.'] } })));
    component.step.set(3);
    component.submit();
    fixture.detectChanges();
    expect(component.step()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Invalid phone.');
  });

  it('auto-logs in and routes by onboarding intent without assigning roles', () => {
    auth.register.mockReturnValue(of({ id: 'u1' }));
    auth.login.mockReturnValue(of({ id: 'u1' }));
    const fixture = create();
    const component = fixture.componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    accountValid(component);
    detailsValid(component);
    component.toggle('HOSPITALITY_OPERATOR');
    component.step.set(3);
    component.submit();
    fixture.detectChanges();

    expect(auth.login).toHaveBeenCalledWith({ email: 'ava@example.com', password: 'password123' });
    expect(navigate).toHaveBeenCalledWith('/account/manage/stays/new');
    expect(toast.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Welcome to SurePlace!', kind: 'action' }));
    expect(component.selected()).toEqual(['HOSPITALITY_OPERATOR']);
  });

  it('shows a safe fallback when registration succeeds but auto-login fails', () => {
    auth.register.mockReturnValue(of({ id: 'u1' }));
    auth.login.mockReturnValue(throwError(() => new Error('login failed')));
    const fixture = create();
    const component = fixture.componentInstance;
    accountValid(component);
    detailsValid(component);
    component.toggle('LOOKING_FOR_PROPERTY');
    component.step.set(3);
    component.submit();
    fixture.detectChanges();

    expect(component.created()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain("Your account was created, but we couldn't sign you in automatically.");
    expect(fixture.nativeElement.querySelector('a[href^="/login"]')).toBeTruthy();
  });
});
