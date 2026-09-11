import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { AgencyManagementApiService } from '../../core/api/manage-api.services';
import { AgencyDashboard } from '../../core/models/manage.models';
import { StatCardComponent } from '../account/account-ui';
import { ManageStatusComponent } from './manage-ui';

@Component({
  standalone: true,
  imports: [RouterLink, StatCardComponent, ManageStatusComponent],
  template: `<section class="page">@if(loading()){<div class="skeleton"></div>}@else if(!dashboard()){<div class="choice"><h1>Manage Listings</h1><p>What would you like to do?</p><div><article><i class="fa-solid fa-user"></i><h2>List independently</h2><p>Post and manage your own properties or stays as an individual.</p><a routerLink="/account/manage/listings/new">Create a listing</a></article><article><i class="fa-solid fa-building-user"></i><h2>Create an agency</h2><p>Set up an agency, invite a team and manage multiple listings.</p><a routerLink="/account/manage/agency/create">Create agency</a></article></div></div>}@else{<header class="agency-head"><div>@if(dashboard()!.agency.logo){<img [src]="dashboard()!.agency.logo" alt="" />}<span><p class="eyebrow">Agency dashboard</p><h1>{{dashboard()!.agency.name}}</h1><p>{{dashboard()!.agency.suburb}} {{dashboard()!.agency.town}}, {{dashboard()!.agency.region}}</p></span></div><sp-manage-status [status]="dashboard()!.verification_status" /></header><div class="stats"><sp-stat-card label="Active listings" [value]="dashboard()!.active_properties + dashboard()!.active_stays" link="/account/manage/agency/listings" /><sp-stat-card label="Team members" [value]="dashboard()!.team_members" link="/account/manage/agency/team" /><sp-stat-card label="Pending invites" [value]="dashboard()!.pending_invitations" link="/account/manage/agency/team" /><sp-stat-card label="Verification" [value]="dashboard()!.verification_status" link="/account/manage/agency/verification" /></div><nav class="actions"><a routerLink="/account/manage/listings/new">Add Listing</a><a routerLink="/account/manage/agency/team">Manage Team</a><a routerLink="/account/manage/agency/profile">Edit Agency Profile</a><a routerLink="/account/manage/verification">Start Verification</a></nav>}</section>`,
  styles: [` .page{display:grid;gap:1rem}.agency-head{display:flex;justify-content:space-between;gap:1rem;align-items:center}.agency-head>div{display:flex;gap:1rem;align-items:center}.agency-head img{width:64px;height:64px;border-radius:var(--radius-sm);object-fit:cover}.eyebrow{color:var(--teal);font-weight:850;text-transform:uppercase;font-size:.75rem}h1,h2,p{margin:.1rem 0}.stats,.choice>div{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem}.choice article{border:1px solid var(--line);border-radius:var(--radius-sm);padding:1rem;display:grid;gap:.55rem}.choice i{font-size:1.6rem;color:var(--teal)}.choice a,.actions a{padding:.7rem .85rem;border-radius:var(--radius-sm);background:var(--teal);color:#fff;text-decoration:none;font-weight:850;text-align:center}.actions{display:flex;flex-wrap:wrap;gap:.6rem}.skeleton{height:180px;background:var(--mist);border-radius:var(--radius-sm)}@media(max-width:760px){.stats,.choice>div{grid-template-columns:1fr}.agency-head{display:grid}}`],
})
export class AgencyDashboardComponent {
  private api = inject(AgencyManagementApiService);
  loading = signal(true);
  dashboard = signal<AgencyDashboard | null>(null);
  constructor() {
    this.api.mine().pipe(switchMap((agencies) => agencies[0] ? this.api.dashboard(agencies[0].id) : of(null)), finalize(() => this.loading.set(false))).subscribe((value) => this.dashboard.set(value));
  }
}
