import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { AuthService } from '../../core/auth/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="auth-page"><section class="auth-card"><h1>{{headline()}}</h1><p>{{message()}}</p>@if(!auth.isAuthenticated()){<a class="primary" routerLink="/login" [queryParams]="{returnUrl:'/agency-invitations/accept', token: token}">Log in</a><a routerLink="/register" [queryParams]="{invite: token}">Create account</a>}@else if(!auth.user()?.is_email_verified){<a class="primary" routerLink="/verify-email/pending" [queryParams]="{email: auth.user()?.email}">Verify email</a>}@else{<button class="primary" (click)="accept()">Accept invitation</button>}<a routerLink="/">Back to SurePlace</a></section></main>`,
  styles: [` .auth-card{display:grid;gap:1rem;text-align:center}.primary,button{justify-self:center;border:0;border-radius:var(--radius-sm);background:var(--teal);color:#fff;padding:.75rem 1rem;font-weight:850;text-decoration:none}`],
})
export class AgencyInvitationAcceptComponent {
  private route = inject(ActivatedRoute);
  private api = inject(AgencyManagementApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  token = this.route.snapshot.queryParamMap.get('token') || '';
  headline = signal('Agency invitation');
  message = signal('Accept your invitation to join this agency on SurePlace.');
  accept() {
    this.api.acceptInvitation(this.token).subscribe({
      next: (res) => { this.headline.set('Invitation accepted'); this.message.set(`You joined ${res.agency.name}.`); this.toast.show({ kind: 'success', title: 'Invitation accepted' }); },
      error: () => { this.headline.set('Invitation unavailable'); this.message.set('This invitation is invalid, expired, or was sent to a different email address.'); },
    });
  }
}
