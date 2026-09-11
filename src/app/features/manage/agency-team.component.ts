import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, forkJoin, switchMap } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { Agency, AgencyInvitation, AgencyMember, AgencyRole } from '../../core/models/manage.models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule],
  template: `<section class="page"><h1>Agency team</h1>@if(agency(); as a){<form class="invite" [formGroup]="form" (ngSubmit)="invite(a)"><input type="email" formControlName="email" placeholder="agent@example.com" /><select formControlName="role"><option value="AGENT">Agent</option><option value="ADMIN">Admin</option></select><button [disabled]="form.invalid||busy()">Invite</button></form><h2>Members</h2><div class="list">@for(m of members(); track m.id){<article><div><strong>{{m.name}}</strong><p>{{m.email}}</p></div><select [value]="m.role" (change)="role(a,m,$any($event.target).value)"><option value="OWNER">Owner</option><option value="ADMIN">Admin</option><option value="AGENT">Agent</option></select><button (click)="remove(a,m)">Remove</button></article>}</div><h2>Invitations</h2><div class="list">@for(i of invitations(); track i.id){<article><div><strong>{{i.email}}</strong><p>{{i.role}} · {{i.status}}</p></div><span>Expires {{i.expires_at | date:'mediumDate'}}</span></article>}</div>}@else{<p>No agency found.</p>}</section>`,
  styles: [` .page{display:grid;gap:1rem}.invite{display:grid;grid-template-columns:1fr 150px auto;gap:.6rem}.list{display:grid;gap:.6rem}article{display:flex;justify-content:space-between;align-items:center;gap:.8rem;border:1px solid var(--line);border-radius:var(--radius-sm);padding:.8rem}p{margin:.15rem 0;color:var(--slate)}input,select{border:1px solid var(--line);border-radius:var(--radius-sm);padding:.65rem}button{border:1px solid var(--line);border-radius:var(--radius-sm);background:#fff;font-weight:850;padding:.65rem .8rem}@media(max-width:680px){.invite,article{display:grid;grid-template-columns:1fr}}`],
})
export class AgencyTeamComponent {
  private api = inject(AgencyManagementApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
  busy = signal(false);
  agency = signal<Agency | null>(null);
  members = signal<AgencyMember[]>([]);
  invitations = signal<AgencyInvitation[]>([]);
  form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]], role: ['AGENT' as AgencyRole, Validators.required] });
  constructor() { this.load(); }
  load() {
    this.api.mine().pipe(switchMap((items) => {
      const agency = items[0]; this.agency.set(agency || null);
      return agency ? forkJoin({ members: this.api.members(agency.id), invitations: this.api.invitations(agency.id) }) : forkJoin({ members: [], invitations: [] });
    })).subscribe(({ members, invitations }) => { this.members.set(members); this.invitations.set(invitations); });
  }
  invite(a: Agency) {
    this.busy.set(true);
    this.api.invite(a.id, this.form.getRawValue()).pipe(finalize(() => this.busy.set(false))).subscribe(() => { this.toast.show({ kind: 'success', title: 'Invitation sent' }); this.form.reset({ email: '', role: 'AGENT' }); this.load(); });
  }
  role(a: Agency, m: AgencyMember, role: AgencyRole) {
    this.api.updateRole(a.id, m.id, role).subscribe(() => { this.toast.show({ kind: 'success', title: 'Role updated' }); this.load(); });
  }
  remove(a: Agency, m: AgencyMember) {
    this.api.removeMember(a.id, m.id).subscribe(() => { this.toast.show({ kind: 'success', title: 'Member removed' }); this.load(); });
  }
}
