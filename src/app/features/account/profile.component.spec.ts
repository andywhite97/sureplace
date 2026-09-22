import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ProfileApiService } from '../../core/api/account-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { User } from '../../core/models/api.models';
import { ToastService } from '../../core/services/toast.service';
import { UserCapabilityService } from '../../core/services/user-capability.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
  const user: User = {
    id: 'user-1',
    email: 'andile@example.com',
    phone_number: '+26876000000',
    first_name: 'Andile',
    last_name: 'Hlophe',
    avatar: null,
    is_email_verified: true,
    is_phone_verified: false,
    is_staff: false,
    onboarding_intents: ['LOOKING_FOR_PROPERTY'],
  };

  function setup(
    update = vi.fn(() => of(user)),
    uploadAvatar = vi.fn(() => of({ ...user, avatar: '/media/avatar.webp' })),
  ) {
    const authUser = signal<User | null>(user);
    const toast = { show: vi.fn() };
    const capabilities = { refresh: vi.fn(() => of({})) };
    const api = { me: vi.fn(() => of(user)), update, uploadAvatar };
    const fixture = TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ProfileApiService, useValue: api },
        { provide: AuthService, useValue: { user: authUser } },
        { provide: ToastService, useValue: toast },
        { provide: UserCapabilityService, useValue: capabilities },
      ],
    }).createComponent(ProfileComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, api, authUser, toast, capabilities };
  }

  it('renders real identity data and initials when no avatar exists', () => {
    const { fixture, component } = setup();

    expect(component.initials(user)).toBe('AH');
    expect(fixture.nativeElement.querySelector('.avatar').textContent).toContain('AH');
    expect(fixture.nativeElement.textContent).not.toContain('Avatar upload is not exposed');
    expect(
      fixture.nativeElement.querySelector('a[href="/account/settings/password"]'),
    ).toBeTruthy();
  });

  it('saves changed profile data once and resets the dirty state', () => {
    const response = { ...user, first_name: 'Andy' };
    const update = vi.fn(() => of(response));
    const { component, authUser, toast, capabilities } = setup(update);
    component.form.controls.first_name.setValue('Andy');
    component.form.controls.first_name.markAsDirty();

    component.save();

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        first_name: 'Andy',
        onboarding_intents: ['LOOKING_FOR_PROPERTY'],
      }),
    );
    expect(component.form.pristine).toBe(true);
    expect(authUser()).toEqual(response);
    expect(capabilities.refresh).toHaveBeenCalledOnce();
    expect(toast.show).toHaveBeenCalledWith('Profile updated.', 'success');
  });

  it('renders saved multi-select intentions as selected accessible cards', () => {
    const { fixture, component } = setup();
    component.toggleIntent('HOSPITALITY_OPERATOR', true);
    fixture.detectChanges();

    const inputs = [
      ...fixture.nativeElement.querySelectorAll('.intent-option input'),
    ] as HTMLInputElement[];
    expect(inputs.map((input) => input.checked)).toEqual([true, false, false, true]);
    expect(fixture.nativeElement.querySelectorAll('.intent-option.selected')).toHaveLength(2);
  });

  it('keeps unsaved intentions local and does not refresh capabilities when save fails', () => {
    const request = new Subject<User>();
    const { component, authUser, capabilities } = setup(vi.fn(() => request));
    component.toggleIntent('PROPERTY_OWNER', true);

    component.save();
    request.error(new HttpErrorResponse({ status: 500 }));

    expect(component.hasIntent('PROPERTY_OWNER')).toBe(true);
    expect(authUser()?.onboarding_intents).toEqual(['LOOKING_FOR_PROPERTY']);
    expect(capabilities.refresh).not.toHaveBeenCalled();
  });

  it('discards edited fields and stored preference changes', () => {
    const { component } = setup();
    component.form.controls.first_name.setValue('Changed');
    component.form.controls.first_name.markAsDirty();
    component.toggleIntent('HOSPITALITY_OPERATOR', true);

    component.discard();

    expect(component.form.getRawValue()).toEqual({
      first_name: 'Andile',
      last_name: 'Hlophe',
      phone_number: '+26876000000',
      onboarding_intents: ['LOOKING_FOR_PROPERTY'],
    });
    expect(component.form.pristine).toBe(true);
  });

  it('uploads a valid profile photo and synchronizes authenticated account state', () => {
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:avatar');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const uploadAvatar = vi.fn(() => of({ ...user, avatar: '/media/avatar.webp' }));
    const { component, authUser, toast } = setup(undefined, uploadAvatar);
    const file = new File(['avatar'], 'avatar.webp', { type: 'image/webp' });
    const files = { 0: file, length: 1, item: () => file } as unknown as FileList;
    const input = document.createElement('input');

    component.changePhoto(files, input);

    expect(uploadAvatar).toHaveBeenCalledWith(file);
    expect(component.user()?.avatar).toBe('/media/avatar.webp');
    expect(authUser()?.avatar).toBe('/media/avatar.webp');
    expect(toast.show).toHaveBeenCalledWith('Profile photo updated.', 'success');
    expect(createObjectUrl).toHaveBeenCalledWith(file);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:avatar');
  });

  it('shows validation and normalized backend field errors', () => {
    const request = new Subject<User>();
    const { component, toast } = setup(vi.fn(() => request));
    component.form.controls.first_name.setValue('');
    component.form.controls.first_name.markAsDirty();
    component.save();
    expect(component.fieldError('first_name')).toBe('First name is required.');

    component.form.controls.first_name.setValue('Andile');
    component.form.controls.first_name.markAsDirty();
    component.save();
    request.error(
      new HttpErrorResponse({
        status: 400,
        error: {
          code: 'validation_error',
          message: 'Check the form.',
          errors: { phone_number: ['Enter a valid phone number.'] },
          request_id: null,
        },
      }),
    );

    expect(component.fieldError('phone_number')).toBe('Enter a valid phone number.');
    expect(toast.show).toHaveBeenCalledWith(
      "We couldn't update your profile. Please try again.",
      'error',
    );
  });
});
