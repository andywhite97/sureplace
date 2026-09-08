import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { normalizeApiError } from '../../core/api/error-normalizer';
import { ToastService } from '../../core/services/toast.service';

type Step = 0 | 1 | 2 | 3;
type Intent = {
  value: string;
  label: string;
  description: string;
  icon: string;
};

const intentOptions: Intent[] = [
  { value: 'LOOKING_FOR_PROPERTY', label: 'Looking for a property', description: 'Rent or buy a home, land or commercial space.', icon: 'fa-solid fa-house' },
  { value: 'PROPERTY_OWNER', label: 'List properties as an owner', description: 'Advertise property you own or manage.', icon: 'fa-solid fa-house-circle-check' },
  { value: 'PROPERTY_AGENT', label: 'List properties as an agent', description: 'Manage listings for clients or an agency.', icon: 'fa-solid fa-user-tie' },
  { value: 'HOSPITALITY_OPERATOR', label: 'List a stay / hospitality business', description: 'Guest houses, lodges, hotels and short stays.', icon: 'fa-solid fa-bed' },
];

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<main class="auth-page"><section class="auth-card register-card" [class.done]="created()">
    @if(!created()){
      <header class="intro"><h1>Create your account</h1><p>Join SurePlace to find, save, list and manage properties and stays across Eswatini.</p></header>
      <ol class="steps" aria-label="Registration progress">@for(item of steps; track item.short; let i = $index){<li [class.active]="step()===i" [class.done]="step()>i" [attr.aria-current]="step()===i ? 'step' : null"><span>{{i+1}}</span><small>{{item.short}}</small></li>}</ol>
      @if(error()){<p class="api-error" role="alert">{{error()}}</p>}
      <form [formGroup]="form">
        @if(step()===0){
          <section class="step-panel"><h2>Create your account</h2><p>Start with your login details.</p>
            <label [class.invalid]="fieldError('email')">Email address<span><i class="fa-solid fa-envelope" aria-hidden="true"></i><input type="email" formControlName="email" autocomplete="email" aria-describedby="email-error"></span><small id="email-error">{{fieldError('email')}}</small></label>
            <label [class.invalid]="fieldError('password')">Password<span><i class="fa-solid fa-lock" aria-hidden="true"></i><input [type]="showPassword() ? 'text' : 'password'" formControlName="password" autocomplete="new-password" aria-describedby="password-error"><button type="button" [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'" (click)="showPassword.set(!showPassword())"><i [class]="showPassword() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true"></i></button></span><small id="password-error">{{fieldError('password') || passwordHint()}}</small></label>
            <label [class.invalid]="fieldError('confirm')">Confirm password<span><i class="fa-solid fa-lock" aria-hidden="true"></i><input [type]="showConfirm() ? 'text' : 'password'" formControlName="confirm" autocomplete="new-password" aria-describedby="confirm-error"><button type="button" [attr.aria-label]="showConfirm() ? 'Hide password confirmation' : 'Show password confirmation'" (click)="showConfirm.set(!showConfirm())"><i [class]="showConfirm() ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'" aria-hidden="true"></i></button></span><small id="confirm-error">{{fieldError('confirm')}}</small></label>
            <button class="primary" type="button" (click)="next()">Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
            <p class="login-link">Already have an account? <a routerLink="/login">Log in</a></p>
          </section>
        }
        @if(step()===1){
          <section class="step-panel"><h2>Your details</h2><p>Tell us a little about yourself.</p>
            <label [class.invalid]="fieldError('first_name')">First name<span><i class="fa-solid fa-user" aria-hidden="true"></i><input formControlName="first_name" autocomplete="given-name" aria-describedby="first-name-error"></span><small id="first-name-error">{{fieldError('first_name')}}</small></label>
            <label [class.invalid]="fieldError('last_name')">Last name<span><i class="fa-solid fa-user" aria-hidden="true"></i><input formControlName="last_name" autocomplete="family-name" aria-describedby="last-name-error"></span><small id="last-name-error">{{fieldError('last_name')}}</small></label>
            <label [class.invalid]="fieldError('phone_number')">Phone number<span><i class="fa-solid fa-phone" aria-hidden="true"></i><input type="tel" formControlName="phone_number" autocomplete="tel" placeholder="+268 76 123 456" aria-describedby="phone-error"></span><small id="phone-error">{{fieldError('phone_number')}}</small></label>
            <div class="actions-row"><button class="secondary" type="button" (click)="back()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button><button class="primary" type="button" (click)="next()">Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>
          </section>
        }
        @if(step()===2){
          <section class="step-panel"><h2>What brings you to SurePlace?</h2><p>Choose one or more. You can use all SurePlace features later.</p>
            <div class="intent-grid">@for(intent of intents; track intent.value){<button type="button" class="intent-card" [class.selected]="selected().includes(intent.value)" [attr.aria-pressed]="selected().includes(intent.value)" (click)="toggle(intent.value)"><i [class]="intent.icon" aria-hidden="true"></i><span><strong>{{intent.label}}</strong><small>{{intent.description}}</small></span><b aria-hidden="true"><i class="fa-solid fa-check"></i></b></button>}</div>
            @if(fieldError('onboarding_intents')){<p class="api-error">{{fieldError('onboarding_intents')}}</p>}
            <div class="actions-row"><button class="secondary" type="button" (click)="back()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button><button class="primary" type="button" (click)="next()">Continue <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button></div>
          </section>
        }
        @if(step()===3){
          <section class="step-panel"><h2>Review your details</h2><p>Make sure everything looks right before creating your account.</p>
            <div class="summary"><article><header><h3>Account</h3><button type="button" (click)="edit(0)"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button></header><dl><div><dt>Email</dt><dd>{{form.controls.email.value}}</dd></div><div><dt>Password</dt><dd>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</dd></div></dl></article>
            <article><header><h3>Personal details</h3><button type="button" (click)="edit(1)"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button></header><dl><div><dt>Name</dt><dd>{{form.controls.first_name.value}} {{form.controls.last_name.value}}</dd></div><div><dt>Phone</dt><dd>{{form.controls.phone_number.value || 'Not provided'}}</dd></div></dl></article>
            <article><header><h3>Your intent</h3><button type="button" (click)="edit(2)"><i class="fa-solid fa-pen" aria-hidden="true"></i> Edit</button></header><div class="intent-summary">@for(intent of selectedLabels(); track intent.value){<span><i [class]="intent.icon" aria-hidden="true"></i>{{intent.label}}</span>}</div></article></div>
            <div class="actions-row"><button class="secondary" type="button" (click)="back()"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Back</button><button class="primary create" type="button" [disabled]="busy()" (click)="submit()">@if(busy()){<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> {{loadingText()}}} @else {Create account}</button></div>
          </section>
        }
      </form>
    }@else{
      <section class="success"><i class="fa-solid fa-circle-check" aria-hidden="true"></i><h1>Welcome to SurePlace!</h1><p>Your account was created, but we couldn't sign you in automatically. Please log in.</p><a class="primary-link" routerLink="/login" [queryParams]="{email: form.controls.email.value}">Log in</a></section>
    }
  </section></main>`,
  styleUrl: './auth-pages.scss',
  styles: [
    `.register-card{width:min(100%,560px);display:grid;gap:1rem}.intro h1,.step-panel h2{margin:0}.intro p,.step-panel>p,.login-link{margin:.3rem 0 0;color:var(--slate);line-height:1.5}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem;list-style:none;margin:0;padding:0}.steps li{display:grid;justify-items:center;gap:.25rem;color:var(--slate);font-size:.75rem}.steps span{width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:var(--mist);border:1px solid var(--line);font-weight:850}.steps .active span,.steps .done span{background:var(--teal);border-color:var(--teal);color:#fff}.steps .active small{color:var(--midnight);font-weight:800}form,.step-panel{display:grid;gap:.8rem;margin:0}.step-panel label{display:grid;gap:.3rem;font-weight:780}label span{display:flex;align-items:center;min-height:50px;border:1px solid var(--line);border-radius:var(--radius-sm);overflow:hidden}label span>i{width:48px;text-align:center;color:var(--teal)}input{border:0!important;min-height:48px;padding:.7rem .8rem .7rem 0!important}label button{width:44px;min-height:44px;border:0;background:transparent;color:var(--slate)}label span:focus-within,.intent-card:focus-visible{outline:3px solid color-mix(in srgb,var(--teal) 25%,transparent);border-color:var(--teal)}label small{min-height:1rem;color:var(--slate);font-weight:500}.invalid span{border-color:var(--danger)}.invalid small,.api-error{color:var(--danger)}button,.primary-link,.success-actions a{min-height:46px;border-radius:var(--radius-sm);font-weight:850;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:.5rem;cursor:pointer}.primary{border:0;background:var(--teal);color:#fff;padding:.75rem 1rem}.secondary{border:1px solid var(--line);background:#fff;color:var(--midnight);padding:.75rem 1rem}.actions-row{display:grid;grid-template-columns:auto 1fr;gap:.7rem}.create{width:100%}.login-link{text-align:center}.intent-grid,.summary,.success,.success-actions{display:grid;gap:.65rem}.intent-card{min-height:84px;display:grid;grid-template-columns:44px 1fr 28px;gap:.75rem;align-items:center;text-align:left;border:1px solid var(--line);background:#fff;padding:.8rem;border-radius:var(--radius-sm);color:var(--midnight)}.intent-card>i{font-size:1.25rem;color:var(--teal);text-align:center}.intent-card span{display:grid;gap:.2rem}.intent-card small{color:var(--slate);font-weight:500;line-height:1.35}.intent-card b{width:24px;height:24px;display:grid;place-items:center;border:1px solid var(--line);border-radius:.45rem;color:transparent}.intent-card.selected{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 8%,white)}.intent-card.selected b{background:var(--teal);border-color:var(--teal);color:#fff}.summary article{border:1px solid var(--line);border-radius:var(--radius-sm);padding:.85rem}.summary header,.summary dl div{display:flex;justify-content:space-between;gap:.75rem}.summary h3{margin:0;font-size:.78rem;text-transform:uppercase;color:var(--slate);letter-spacing:.04em}.summary header button{border:0;background:transparent;color:var(--teal);font-weight:800}.summary dl{display:grid;gap:.35rem;margin:.6rem 0 0}.summary dt{color:var(--slate)}.summary dd{margin:0;text-align:right;font-weight:750}.intent-summary{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.65rem}.intent-summary span{display:inline-flex;align-items:center;gap:.35rem;border-radius:999px;background:var(--mist);padding:.4rem .6rem;font-weight:750}.intent-summary i,.success>i{color:var(--teal)}.success{text-align:center}.success>i{font-size:3rem}.primary-link{background:var(--teal);color:#fff;padding:.8rem 1rem}.success-actions a{border:1px solid var(--line);color:var(--midnight)}@media(max-width:560px){.register-card{width:100%;padding:1.1rem}.auth-page{padding:1rem}.steps small{font-size:.68rem}.actions-row{grid-template-columns:1fr}.intent-card{grid-template-columns:38px 1fr 26px;padding:.7rem}.summary dl div{display:grid}.summary dd{text-align:left}}`,
  ],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
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
  selectedLabels = computed(() => this.intents.filter((intent) => this.selected().includes(intent.value)));

  toggle(value: string) {
    this.selected.update((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
    this.fieldErrors.update(({ onboarding_intents, ...rest }) => rest);
  }
  next() {
    this.error.set('');
    if (!this.validateStep(this.step())) return;
    this.step.update((value) => Math.min(3, value + 1) as Step);
  }
  back() { this.error.set(''); this.step.update((value) => Math.max(0, value - 1) as Step); }
  edit(value: Step) { this.error.set(''); this.step.set(value); }
  submit() {
    if (this.busy() || !this.validateAll()) return;
    const { confirm, ...body } = this.form.getRawValue();
    this.busy.set(true);
    this.loadingText.set('Creating your account...');
    this.error.set('');
    this.auth.register({ ...body, onboarding_intents: this.selected() }).subscribe({
      next: () => {
        this.loadingText.set('Signing you in...');
        this.auth.login({ email: body.email, password: body.password }).subscribe({
          next: () => {
            this.busy.set(false);
            this.toast.show({ kind: 'action', title: 'Welcome to SurePlace!', message: 'Your account is ready.', action: { label: 'Go to account', run: () => void this.router.navigateByUrl('/account') } });
            void this.router.navigateByUrl(this.successPrimary().path);
          },
          error: () => {
            this.busy.set(false);
            this.created.set(true);
            this.error.set("Your account was created, but we couldn't sign you in automatically. Please log in.");
          },
        });
      },
      error: (e) => {
        this.busy.set(false);
        this.handleBackendError(e);
      },
    });
  }
  fieldError(field: string) { return this.fieldErrors()[field] || ''; }
  passwordHint() { return this.form.controls.password.dirty ? 'Use at least 8 characters.' : ''; }
  successPrimary() {
    const selected = this.selected();
    if (selected.includes('PROPERTY_AGENT')) return { label: 'Manage Listings', path: '/account/manage' };
    if (selected.includes('PROPERTY_OWNER')) return { label: 'Add a Property', path: '/account/manage/properties/new' };
    if (selected.includes('HOSPITALITY_OPERATOR')) return { label: 'Add a Stay', path: '/account/manage/stays/new' };
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
    return options.filter((option) => this.selected().includes(option.value) && option.path !== primary).map(({ label, path }) => ({ label, path }));
  }
  private validateStep(step: Step) {
    const fields = step === 0 ? ['email', 'password', 'confirm'] : step === 1 ? ['first_name', 'last_name', 'phone_number'] : [];
    fields.forEach((field) => this.form.get(field)?.markAsTouched());
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const control = this.form.get(field);
      if (control?.hasError('required')) errors[field] = 'This field is required.';
      else if (control?.hasError('email')) errors[field] = 'Enter a valid email address.';
      else if (control?.hasError('minlength')) errors[field] = 'Use at least 8 characters.';
    }
    if (step === 0 && this.form.controls.password.value !== this.form.controls.confirm.value) errors['confirm'] = 'Passwords do not match.';
    if (step === 2 && !this.selected().length) errors['onboarding_intents'] = 'Choose at least one option.';
    this.fieldErrors.set({ ...this.fieldErrors(), ...errors });
    if (!Object.keys(errors).length) {
      const clear = new Set([...fields, step === 2 ? 'onboarding_intents' : '']);
      this.fieldErrors.update((all) => Object.fromEntries(Object.entries(all).filter(([key]) => !clear.has(key))));
      return true;
    }
    return false;
  }
  private validateAll() { return this.validateStep(0) && this.validateStep(1) && this.validateStep(2); }
  private handleBackendError(error: unknown) {
    const normalized = normalizeApiError(error);
    const raw = (error as { error?: unknown })?.error;
    const direct = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const errors = { ...normalized.errors, ...direct };
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(errors)) {
      if (['email', 'password', 'first_name', 'last_name', 'phone_number', 'onboarding_intents'].includes(key)) mapped[key] = Array.isArray(value) ? String(value[0]) : String(value);
    }
    this.fieldErrors.set(mapped);
    if (mapped['email'] || mapped['password']) this.step.set(0);
    else if (mapped['first_name'] || mapped['last_name'] || mapped['phone_number']) this.step.set(1);
    else if (mapped['onboarding_intents']) this.step.set(2);
    this.error.set(Object.keys(mapped).length ? 'Please fix the highlighted fields.' : normalized.message);
  }
}
