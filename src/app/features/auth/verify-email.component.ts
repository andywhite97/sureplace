import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/auth/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { ToastService } from '../../core/services/toast.service';

type VerifyState = 'pending' | 'verifying' | 'verified' | 'expired' | 'invalid' | 'error';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="auth-page"><section class="auth-card verify-card">
    <i [class]="icon()" aria-hidden="true"></i>
    <h1>{{headline()}}</h1>
    <p>{{body()}}</p>
    @if(showEmail()){<p class="email">{{maskedEmail()}}</p>}
    @if(state()==='expired' || state()==='invalid' || state()==='pending'){
      <button class="primary" type="button" [disabled]="busy() || cooldown()>0 || !email()" (click)="resend()">
        @if(busy()){<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Sending...}
        @else if(cooldown()>0){Resend available in {{cooldown()}}s}
        @else{Resend verification email}
      </button>
    }
    @if(state()==='verified'){<a class="primary" routerLink="/login" [queryParams]="emailQuery()">Log in</a>}
    @if(state()==='error'){<button class="primary" type="button" (click)="verify()">Try again</button>}
    <a class="secondary" routerLink="/login" [queryParams]="emailQuery()">Back to login</a>
    @if(statusText()){<p class="status" role="status">{{statusText()}}</p>}
  </section></main>`,
  styleUrl: './auth-pages.scss',
  styles: [
    `.verify-card{width:min(100%,500px);display:grid;justify-items:center;text-align:center;gap:.85rem}h1,p{margin:0}.verify-card>i{font-size:3rem;color:var(--teal)}.verify-card>p{color:var(--slate);line-height:1.5}.email{padding:.45rem .7rem;border-radius:999px;background:var(--mist);color:var(--midnight)!important;font-weight:850}.primary,.secondary{min-height:48px;border-radius:var(--radius-sm);padding:.75rem 1rem;font-weight:850;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:.5rem}.primary{border:0;background:var(--teal);color:#fff}.primary:disabled{opacity:.7}.secondary{border:1px solid var(--line);background:#fff;color:var(--midnight)}.status{font-weight:750}@media(max-width:560px){.auth-page{padding:1rem}.verify-card{width:100%;padding:1.1rem}}`,
  ],
})
export class VerifyEmailComponent {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private seo = inject(SeoService);
  token = this.route.snapshot.queryParamMap.get('token') || '';
  email = signal(this.route.snapshot.queryParamMap.get('email') || '');
  state = signal<VerifyState>(this.token ? 'verifying' : 'pending');
  busy = signal(false);
  cooldown = signal(0);
  statusText = signal('');
  showEmail = computed(() => Boolean(this.email()));
  maskedEmail = computed(() => maskEmail(this.email()));
  emailQuery = computed(() => this.email() ? { email: this.email() } : {});
  headline = computed(() => {
    switch (this.state()) {
      case 'verifying': return 'Verifying your email';
      case 'verified': return 'Email verified';
      case 'expired': return 'Verification link expired';
      case 'invalid': return 'Verification link is invalid';
      case 'error': return "We couldn't verify that link";
      default: return 'Check your email';
    }
  });
  body = computed(() => {
    switch (this.state()) {
      case 'verifying': return 'Please wait while we confirm your email address.';
      case 'verified': return 'Your email has been verified successfully.';
      case 'expired': return 'Request a new verification email to continue.';
      case 'invalid': return 'This verification link is no longer valid.';
      case 'error': return 'Please try again, or request a new verification email.';
      default: return 'We sent a verification link to your email address.';
    }
  });
  icon = computed(() => this.state() === 'verified' ? 'fa-solid fa-circle-check' : this.state() === 'verifying' ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-envelope-circle-check');

  constructor() {
    this.seo.privatePage('Verify your SurePlace email', 'Verify your email address to finish setting up SurePlace.');
    if (this.token) this.verify();
  }

  verify() {
    if (!this.token) { this.state.set('invalid'); return; }
    this.state.set('verifying');
    this.auth.verifyEmail(this.token).subscribe({
      next: () => {
        this.state.set('verified');
        this.statusText.set('You can now log in to SurePlace.');
      },
      error: (error: HttpErrorResponse) => {
        if (error.status === 410) this.state.set('expired');
        else if (error.status === 400) this.state.set('invalid');
        else this.state.set('error');
      },
    });
  }

  resend() {
    const email = this.email();
    if (!email || this.busy() || this.cooldown() > 0) return;
    this.busy.set(true);
    this.auth.resendVerification(email).pipe(finalize(() => this.busy.set(false))).subscribe({
      next: () => {
        this.statusText.set('Verification email sent.');
        this.toast.show({ kind: 'success', title: 'Verification email sent', message: 'Please check your inbox.' });
        this.startCooldown();
      },
      error: () => {
        this.statusText.set("We couldn't send the verification email right now. Please try again shortly.");
      },
    });
  }

  private startCooldown() {
    this.cooldown.set(60);
    const tick = window.setInterval(() => {
      this.cooldown.update((value) => {
        if (value <= 1) {
          window.clearInterval(tick);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  }
}

function maskEmail(value: string) {
  const [local, domain] = value.split('@');
  if (!local || !domain) return value;
  return `${local[0]}${'*'.repeat(Math.min(5, Math.max(1, local.length - 1)))}@${domain}`;
}
