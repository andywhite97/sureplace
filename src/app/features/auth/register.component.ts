import { SuriGuideComponent } from '../../shared/ui/suri-guide.component';
import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { ToastService } from '../../core/services/toast.service';
import { SeoService } from '../../core/services/seo.service';
import { EswatiniPhoneInputComponent } from '../../shared/ui/eswatini-phone-input.component';

type Step = 0 | 1 | 2 | 3;
type Intent = {
  value: string;
  label: string;
  description: string;
  icon: string;
};

const intentOptions: Intent[] = [
  {
    value: 'LOOKING_FOR_PROPERTY',
    label: 'Find a property or stay',
    description: 'Rent or buy a home, land or commercial space.',
    icon: 'fa-solid fa-house',
  },
  {
    value: 'PROPERTY_OWNER',
    label: 'List my property',
    description: 'Advertise property you own or manage.',
    icon: 'fa-solid fa-house-circle-check',
  },
  {
    value: 'PROPERTY_AGENT',
    label: 'I’m a real estate agent',
    description: 'Manage listings for clients or an agency.',
    icon: 'fa-solid fa-user-tie',
  },
  {
    value: 'HOSPITALITY_OPERATOR',
    label: 'Manage accommodation',
    description: 'Guest houses, lodges, hotels and short stays.',
    icon: 'fa-solid fa-bed',
  },
];

@Component({
  standalone: true,
  imports: [SuriGuideComponent, ReactiveFormsModule, RouterLink, EswatiniPhoneInputComponent],
  template: `<main class="auth-page">
    <section class="auth-card register-card" [class.done]="created()">
      @if (!created()) {
        <header class="registration-intro">
          <sp-suri-guide size="small" message="Hi, I’m Suri. Let’s get you settled in." />
          <h1>Create your account</h1>
          <p>Join SurePlace and discover more possibilities.</p>
        </header>
        <ol class="steps" aria-label="Registration progress">
          @for (item of steps; track item.short; let i = $index) {
            <li
              [class.active]="step() === i"
              [class.done]="step() > i"
              [attr.aria-current]="step() === i ? 'step' : null"
            >
              <span>{{ i + 1 }}</span
              ><small>{{ item.short }}</small>
            </li>
          }
        </ol>
        @if (error()) {
          <p class="api-error" role="alert">{{ error() }}</p>
        }
        <form
          [formGroup]="form"
          (ngSubmit)="step() < 3 ? next() : submit()"
          novalidate
          [attr.aria-busy]="busy()"
        >
          @if (step() === 0) {
            <section class="step-panel">
              <h2 #stepHeading tabindex="-1">Your login details</h2>
              <p>Start with your login details.</p>
              <label [class.invalid]="fieldError('email')"
                >Email address<span
                  ><i class="fa-solid fa-envelope" aria-hidden="true"></i
                  ><input
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    aria-describedby="email-error" /></span
                ><small id="email-error">{{ fieldError('email') }}</small></label
              >
              <label [class.invalid]="fieldError('password')"
                >Password<span
                  ><i class="fa-solid fa-lock" aria-hidden="true"></i
                  ><input
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="new-password"
                    aria-describedby="password-error" /><button
                    type="button"
                    [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                    (click)="showPassword.set(!showPassword())"
                  >
                    <i
                      [class]="showPassword() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                      aria-hidden="true"
                    ></i></button></span
                ><small id="password-error">{{
                  fieldError('password') || passwordHint()
                }}</small></label
              >
              <label [class.invalid]="fieldError('confirm')"
                >Confirm password<span
                  ><i class="fa-solid fa-lock" aria-hidden="true"></i
                  ><input
                    [type]="showConfirm() ? 'text' : 'password'"
                    formControlName="confirm"
                    autocomplete="new-password"
                    aria-describedby="confirm-error" /><button
                    type="button"
                    [attr.aria-label]="
                      showConfirm() ? 'Hide password confirmation' : 'Show password confirmation'
                    "
                    (click)="showConfirm.set(!showConfirm())"
                  >
                    <i
                      [class]="showConfirm() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'"
                      aria-hidden="true"
                    ></i></button></span
                ><small id="confirm-error">{{ fieldError('confirm') }}</small></label
              >
              <button class="primary" type="submit" [disabled]="!canAdvance() || busy()">
                Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </button>
              <p class="login-link">
                Already have an account?
                <a routerLink="/login" [queryParams]="{ returnUrl: returnUrl }">Log in</a>
              </p>
            </section>
          }
          @if (step() === 1) {
            <section class="step-panel">
              <h2 #stepHeading tabindex="-1">Your details</h2>
              <p>Tell us a little about yourself.</p>
              <label [class.invalid]="fieldError('first_name')"
                >First name<span
                  ><i class="fa-solid fa-user" aria-hidden="true"></i
                  ><input
                    formControlName="first_name"
                    autocomplete="given-name"
                    aria-describedby="first-name-error" /></span
                ><small id="first-name-error">{{ fieldError('first_name') }}</small></label
              >
              <label [class.invalid]="fieldError('last_name')"
                >Last name<span
                  ><i class="fa-solid fa-user" aria-hidden="true"></i
                  ><input
                    formControlName="last_name"
                    autocomplete="family-name"
                    aria-describedby="last-name-error" /></span
                ><small id="last-name-error">{{ fieldError('last_name') }}</small></label
              >
              <label [class.invalid]="fieldError('phone_number')"
                >Phone number<sp-eswatini-phone-input
                  formControlName="phone_number"
                  placeholder="76 123 456"
                  describedBy="phone-error"
                  [invalid]="!!fieldError('phone_number')"
                /><small id="phone-error">{{ fieldError('phone_number') }}</small></label
              >
              <div class="actions-row">
                <button class="secondary" type="button" (click)="back()">
                  <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button
                ><button class="primary" type="submit" [disabled]="!canAdvance() || busy()">
                  Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
              </div>
            </section>
          }
          @if (step() === 2) {
            <section class="step-panel">
              <h2 #stepHeading tabindex="-1">What brings you to SurePlace?</h2>
              <p>Choose one or more. Your selection helps us guide you to the right tools.</p>
              <p class="browse-note">
                Just exploring? <a routerLink="/">Browse without an account</a>.
              </p>
              <div class="intent-grid">
                @for (intent of intents; track intent.value) {
                  <button
                    type="button"
                    class="intent-card"
                    [class.selected]="selected().includes(intent.value)"
                    [attr.aria-pressed]="selected().includes(intent.value)"
                    (click)="toggle(intent.value)"
                  >
                    <i [class]="intent.icon" aria-hidden="true"></i
                    ><span
                      ><strong>{{ intent.label }}</strong
                      ><small>{{ intent.description }}</small></span
                    ><b aria-hidden="true"><i class="fa-solid fa-check"></i></b>
                  </button>
                }
              </div>
              @if (fieldError('onboarding_intents')) {
                <p class="api-error">{{ fieldError('onboarding_intents') }}</p>
              }
              <div class="actions-row">
                <button class="secondary" type="button" (click)="back()">
                  <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button
                ><button class="primary" type="submit" [disabled]="!canAdvance() || busy()">
                  Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </button>
              </div>
            </section>
          }
          @if (step() === 3) {
            <section class="step-panel">
              <h2 #stepHeading tabindex="-1">Review your details</h2>
              <p>Make sure everything looks right before creating your account.</p>
              <div class="summary">
                <article>
                  <header>
                    <h3>Account</h3>
                    <button type="button" (click)="edit(0)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i> Edit
                    </button>
                  </header>
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>{{ form.controls.email.value }}</dd>
                    </div>
                    <div>
                      <dt>Password</dt>
                      <dd>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</dd>
                    </div>
                  </dl>
                </article>
                <article>
                  <header>
                    <h3>Personal details</h3>
                    <button type="button" (click)="edit(1)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i> Edit
                    </button>
                  </header>
                  <dl>
                    <div>
                      <dt>Name</dt>
                      <dd>
                        {{ form.controls.first_name.value }} {{ form.controls.last_name.value }}
                      </dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{{ form.controls.phone_number.value || 'Not provided' }}</dd>
                    </div>
                  </dl>
                </article>
                <article>
                  <header>
                    <h3>Your intent</h3>
                    <button type="button" (click)="edit(2)">
                      <i class="fa-solid fa-pen" aria-hidden="true"></i> Edit
                    </button>
                  </header>
                  <div class="intent-summary">
                    @for (intent of selectedLabels(); track intent.value) {
                      <span
                        ><i [class]="intent.icon" aria-hidden="true"></i>{{ intent.label }}</span
                      >
                    }
                  </div>
                </article>
              </div>
              <p class="policy-note">
                By creating an account, you agree to our <a routerLink="/terms">Terms</a> and
                <a routerLink="/privacy">Privacy Policy</a>.
              </p>
              <div class="actions-row">
                <button class="secondary" type="button" (click)="back()">
                  <i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button
                ><button class="primary create" type="submit" [disabled]="busy()">
                  @if (busy()) {
                    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                    {{ loadingText() }}
                  } @else {
                    Create account
                  }
                </button>
              </div>
            </section>
          }
        </form>
      } @else {
        <section class="success">
          <sp-suri-guide message="You’re nearly there. Check your inbox for the next step." />
          <h1>Check your email</h1>
          <p>
            We sent a verification link to {{ maskedEmail() }}. Confirm your email to finish setting
            up your account.
          </p>
          <a
            class="primary-link"
            routerLink="/verify-email/pending"
            [queryParams]="{ email: form.controls.email.value }"
            >Continue</a
          >
        </section>
      }
    </section>
  </main>`,
  styleUrls: ['./auth-pages.scss', './register.component.scss'],
})
export class RegisterComponent {
  readonly stepHeading = viewChild<ElementRef<HTMLHeadingElement>>('stepHeading');
  returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private seo = inject(SeoService);
  steps = [{ short: 'Account' }, { short: 'Details' }, { short: 'Intent' }, { short: 'Review' }];
  intents = intentOptions;
  step = signal<Step>(0);
  selected = signal<string[]>([]);
  busy = signal(false);
  loadingText = signal('Creating your account...');
  error = signal('');
  fieldErrors = signal<Record<string, string>>({});
  showPassword = signal(false);
  showConfirm = signal(false);
  created = signal(false);
  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    phone_number: [''],
  });
  selectedLabels = computed(() =>
    this.intents.filter((intent) => this.selected().includes(intent.value)),
  );

  constructor() {
    afterRenderEffect(() => {
      this.step();
      this.stepHeading()?.nativeElement.focus({ preventScroll: true });
      this.stepHeading()?.nativeElement.scrollIntoView?.({ block: 'nearest' });
    });
    for (const key of Object.keys(this.form.controls) as (keyof typeof this.form.controls)[]) {
      this.form.controls[key].valueChanges
        .pipe(takeUntilDestroyed())
        .subscribe(() =>
          this.fieldErrors.update((errors) =>
            Object.fromEntries(
              Object.entries(errors).filter(
                ([name]) => name !== key && !(key === 'password' && name === 'confirm'),
              ),
            ),
          ),
        );
    }
    this.seo.privatePage(
      'Create a SurePlace account',
      'Create a SurePlace account to save listings and manage enquiries.',
    );
  }

  toggle(value: string) {
    this.selected.update((items) =>
      items.includes(value) ? items.filter((item) => item !== value) : [...items, value],
    );
    this.fieldErrors.update(({ onboarding_intents, ...rest }) => rest);
  }
  next() {
    if (this.busy()) return;
    this.error.set('');
    if (!this.validateStep(this.step())) return;
    this.step.update((value) => Math.min(3, value + 1) as Step);
  }
  back() {
    if (this.busy()) return;
    this.error.set('');
    this.step.update((value) => Math.max(0, value - 1) as Step);
  }
  edit(value: Step) {
    if (this.busy()) return;
    this.error.set('');
    this.step.set(value);
  }
  submit() {
    if (this.busy() || !this.validateAll()) return;
    const { confirm, ...body } = this.form.getRawValue();
    this.busy.set(true);
    this.loadingText.set('Creating your account...');
    this.error.set('');
    this.auth.register({ ...body, onboarding_intents: this.selected() }).subscribe({
      next: () => {
        this.busy.set(false);
        this.created.set(true);
        this.toast.show({
          kind: 'success',
          title: 'Check your email',
          message: 'We sent a verification link.',
        });
        void this.router.navigate(['/verify-email/pending'], {
          queryParams: {
            email: body.email,
            ...(this.returnUrl ? { returnUrl: this.returnUrl } : {}),
          },
        });
      },
      error: (e) => {
        this.busy.set(false);
        this.handleBackendError(e);
      },
    });
  }
  canAdvance() {
    if (this.step() === 0)
      return (
        this.form.controls.email.valid &&
        this.form.controls.password.valid &&
        this.form.controls.confirm.valid &&
        this.form.controls.password.value === this.form.controls.confirm.value
      );
    if (this.step() === 1)
      return (
        this.form.controls.first_name.valid &&
        this.form.controls.last_name.valid &&
        this.form.controls.phone_number.valid
      );
    return this.selected().length > 0;
  }
  fieldError(field: string) {
    if (this.fieldErrors()[field]) return this.fieldErrors()[field];
    const control = this.form.get(field);
    if (!control || !(control.dirty || control.touched)) return '';
    if (control.hasError('required')) return 'This field is required.';
    if (control.hasError('email')) return 'Enter a valid email address.';
    if (control.hasError('minlength')) return 'Use at least 8 characters.';
    if (field === 'confirm' && control.value !== this.form.controls.password.value)
      return 'Passwords do not match.';
    return '';
  }
  maskedEmail() {
    return maskEmail(this.form.controls.email.value);
  }
  passwordHint() {
    return this.form.controls.password.dirty ? 'Use at least 8 characters.' : '';
  }
  successPrimary() {
    const selected = this.selected();
    if (selected.includes('PROPERTY_AGENT'))
      return { label: 'Manage Listings', path: '/account/manage' };
    if (selected.includes('PROPERTY_OWNER'))
      return { label: 'Add a Property', path: '/account/manage/properties/new' };
    if (selected.includes('HOSPITALITY_OPERATOR'))
      return { label: 'Add a Stay', path: '/account/manage/stays/new' };
    return { label: 'Browse Properties', path: '/properties' };
  }
  successSecondary() {
    const options = [
      { value: 'LOOKING_FOR_PROPERTY', label: 'Browse Properties', path: '/properties' },
      { value: 'PROPERTY_OWNER', label: 'Add a Property', path: '/account/manage/properties/new' },
      { value: 'PROPERTY_AGENT', label: 'Manage Listings', path: '/account/manage' },
      { value: 'HOSPITALITY_OPERATOR', label: 'Add a Stay', path: '/account/manage/stays/new' },
    ];
    const primary = this.successPrimary().path;
    return options
      .filter((option) => this.selected().includes(option.value) && option.path !== primary)
      .map(({ label, path }) => ({ label, path }));
  }
  private validateStep(step: Step) {
    const fields =
      step === 0
        ? ['email', 'password', 'confirm']
        : step === 1
          ? ['first_name', 'last_name', 'phone_number']
          : [];
    fields.forEach((field) => this.form.get(field)?.markAsTouched());
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const control = this.form.get(field);
      if (control?.hasError('required')) errors[field] = 'This field is required.';
      else if (control?.hasError('email')) errors[field] = 'Enter a valid email address.';
      else if (control?.hasError('minlength')) errors[field] = 'Use at least 8 characters.';
    }
    if (step === 0 && this.form.controls.password.value !== this.form.controls.confirm.value)
      errors['confirm'] = 'Passwords do not match.';
    if (step === 2 && !this.selected().length)
      errors['onboarding_intents'] = 'Choose at least one option.';
    this.fieldErrors.set({ ...this.fieldErrors(), ...errors });
    if (!Object.keys(errors).length) {
      const clear = new Set([...fields, step === 2 ? 'onboarding_intents' : '']);
      this.fieldErrors.update((all) =>
        Object.fromEntries(Object.entries(all).filter(([key]) => !clear.has(key))),
      );
      return true;
    }
    return false;
  }
  private validateAll() {
    return this.validateStep(0) && this.validateStep(1) && this.validateStep(2);
  }
  private handleBackendError(error: unknown) {
    const normalized = normalizeApiError(error);
    const raw = (error as { error?: unknown })?.error;
    const direct = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const errors = { ...normalized.errors, ...direct };
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (
        [
          'email',
          'password',
          'first_name',
          'last_name',
          'phone_number',
          'onboarding_intents',
        ].includes(key)
      )
        mapped[key] = Array.isArray(value) ? String(value[0]) : String(value);
    }
    this.fieldErrors.set(mapped);
    if (mapped['email'] || mapped['password']) this.step.set(0);
    else if (mapped['first_name'] || mapped['last_name'] || mapped['phone_number'])
      this.step.set(1);
    else if (mapped['onboarding_intents']) this.step.set(2);
    this.error.set(
      Object.keys(mapped).length ? 'Please fix the highlighted fields.' : normalized.message,
    );
  }
}

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  return `${local[0]}${'*'.repeat(Math.min(5, Math.max(1, local.length - 1)))}@${domain}`;
}
