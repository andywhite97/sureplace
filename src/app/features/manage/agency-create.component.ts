import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ToastService } from '../../core/services/toast.service';

type Step = 0 | 1 | 2 | 3 | 4;

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<section class="agency-flow">
    @if(step()<4){
      <header><a routerLink="/account/manage"><i class="fa-solid fa-arrow-left"></i> Back</a><p class="eyebrow">Create agency</p><h1>Set up your agency</h1></header>
      <ol class="steps">@for(s of labels; track s; let i=$index){<li [class.active]="step()===i" [class.done]="step()>i"><span>{{i+1}}</span><small>{{s}}</small></li>}</ol>
      @if(error()){<p class="error">{{error()}}</p>}
      <form [formGroup]="form">
        @if(step()===0){<section class="panel"><h2>Agency details</h2><label>Agency name<input formControlName="name" /></label><label>Trading name<input formControlName="trading_name" /></label><label>Description<textarea formControlName="description"></textarea></label><label>Logo<input type="file" accept="image/png,image/jpeg,image/webp" (change)="setLogo($any($event.target).files)" /></label><button type="button" class="primary" (click)="next()">Continue</button></section>}
        @if(step()===1){<section class="panel"><h2>Contact details</h2><label>Business email<input type="email" formControlName="email" /></label><label>Business phone<input formControlName="phone" placeholder="+26876123456" /></label><label>WhatsApp<input formControlName="whatsapp_number" placeholder="+26876123456" /></label><label>Website<input formControlName="website" placeholder="https://example.com" /></label><div class="actions"><button type="button" class="secondary" (click)="back()">Back</button><button type="button" class="primary" (click)="next()">Continue</button></div></section>}
        @if(step()===2){<section class="panel"><h2>Location</h2><label>Region<select formControlName="region"><option value="">Select region</option>@for(r of regions(); track r.value){<option [value]="r.label">{{r.label}}</option>}</select></label><label>Town<select formControlName="town"><option value="">Select town</option>@for(t of towns(); track t){<option [value]="t">{{t}}</option>}</select></label><label>Suburb / Area<input formControlName="suburb" /></label><label>Street / Address<textarea formControlName="address"></textarea></label><div class="actions"><button type="button" class="secondary" (click)="back()">Back</button><button type="button" class="primary" (click)="next()">Continue</button></div></section>}
        @if(step()===3){<section class="panel"><h2>Review & create</h2><div class="review"><strong>{{form.controls.name.value}}</strong><p>{{form.controls.description.value || 'No description yet.'}}</p><dl><div><dt>Email</dt><dd>{{form.controls.email.value}}</dd></div><div><dt>Phone</dt><dd>{{form.controls.phone.value}}</dd></div><div><dt>Location</dt><dd>{{form.controls.suburb.value}} {{form.controls.town.value}}, {{form.controls.region.value}}</dd></div><div><dt>Verification</dt><dd>Starts as unverified</dd></div></dl></div><div class="actions"><button type="button" class="secondary" (click)="back()">Back</button><button type="button" class="primary" [disabled]="busy()" (click)="submit()">@if(busy()){Creating...}@else{Create Agency}</button></div></section>}
      </form>
    } @else {
      <section class="panel success"><i class="fa-solid fa-circle-check"></i><h1>Agency Created!</h1><p>{{createdName()}} has been successfully created.</p><p>You are the agency owner.</p><div class="actions"><a class="primary" routerLink="/account/manage/agency">Go to Agency Dashboard</a><a class="secondary" routerLink="/account/manage/listings/new">Create a Listing</a></div></section>
    }
  </section>`,
  styles: [` .agency-flow{display:grid;gap:1rem;max-width:760px;margin:auto}.eyebrow{color:var(--teal);font-weight:850;text-transform:uppercase;font-size:.75rem}h1,h2,p{margin:.1rem 0}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:.35rem;list-style:none;padding:0;margin:0}.steps li{display:grid;justify-items:center;color:var(--slate);font-size:.75rem}.steps span{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:var(--mist);font-weight:850}.steps .active span,.steps .done span{background:var(--teal);color:#fff}.panel{display:grid;gap:.85rem;border:1px solid var(--line);border-radius:var(--radius-sm);padding:1rem;background:#fff}label{display:grid;gap:.35rem;font-weight:800}input,textarea,select{width:100%;border:1px solid var(--line);border-radius:var(--radius-sm);padding:.65rem;min-height:44px}textarea{min-height:96px}.actions{display:flex;gap:.65rem;flex-wrap:wrap}.primary,.secondary{min-height:44px;border-radius:var(--radius-sm);padding:.7rem .9rem;font-weight:850;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.primary{border:0;background:var(--teal);color:#fff}.secondary{border:1px solid var(--line);background:#fff;color:var(--midnight)}.review{border:1px solid var(--line);border-radius:var(--radius-sm);padding:.85rem}.review dl{display:grid;gap:.45rem}.review div{display:flex;justify-content:space-between;gap:1rem}.review dd{margin:0;text-align:right}.success{text-align:center;justify-items:center}.success>i{font-size:3rem;color:var(--teal)}.error{color:var(--danger);font-weight:800}@media(max-width:560px){.steps small{display:none}.actions{display:grid}.review div{display:grid}.review dd{text-align:left}}`],
})
export class AgencyCreateComponent {
  private fb = inject(FormBuilder);
  private api = inject(AgencyManagementApiService);
  private refs = inject(ReferenceApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  labels = ['Details', 'Contact', 'Location', 'Review'];
  step = signal<Step>(0);
  busy = signal(false);
  error = signal('');
  createdName = signal('');
  logo = signal<File | null>(null);
  regions = computed(() => this.refs.data().regions);
  towns = computed(() => this.regions().find((r) => r.label === this.form.controls.region.value)?.areas || []);
  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    trading_name: [''],
    description: [''],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    whatsapp_number: [''],
    website: [''],
    region: ['', Validators.required],
    town: ['', Validators.required],
    suburb: [''],
    address: [''],
  });
  setLogo(files: FileList | null) { this.logo.set(files?.[0] || null); }
  next() { if (!this.validate()) return; this.step.update((v) => Math.min(3, v + 1) as Step); }
  back() { this.error.set(''); this.step.update((v) => Math.max(0, v - 1) as Step); }
  validate() {
    const groups = [['name'], ['email', 'phone'], ['region', 'town'], []][this.step()];
    groups.forEach((f) => this.form.get(f)?.markAsTouched());
    const invalid = groups.some((f) => this.form.get(f)?.invalid);
    this.error.set(invalid ? 'Please complete the required fields.' : '');
    return !invalid;
  }
  submit() {
    if (this.busy() || !this.validate()) return;
    const data = new FormData();
    Object.entries(this.form.getRawValue()).forEach(([key, value]) => data.append(key, value || ''));
    if (this.logo()) data.append('logo', this.logo()!);
    this.busy.set(true);
    this.api.create(data).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: (agency) => {
        this.createdName.set(agency.name);
        this.toast.show({ kind: 'success', title: 'Agency created successfully', message: agency.name });
        this.step.set(4);
      },
      error: (e) => {
        if (e?.error?.code === 'email_not_verified') void this.router.navigate(['/verify-email/pending'], { queryParams: { email: e?.error?.email } });
        this.error.set(e?.error?.message || 'Could not create agency. Please check the form and try again.');
      },
    });
  }
}
