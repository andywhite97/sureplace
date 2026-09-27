import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { StaffAccessState, StaffApiService, StaffRole } from '../../core/api/staff-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  standalone: true,
  imports: [FormsModule],
  template: `
    <header class="page-head"><div><span class="eyebrow">ADMINISTRATION</span><h1>Staff access &amp; roles</h1>
      <p>Grant only the capabilities each staff member needs. API checks apply immediately; staff should refresh to update their navigation.</p></div></header>
    @if (loading()) { <section class="panel state">Loading staff access…</section> }
    @else if (error()) { <section class="panel state"><p>{{ error() }}</p><button (click)="load()">Retry</button></section> }
    @else if (state(); as data) {
      <div class="access-grid">
        <section class="panel"><div class="section-head"><div><h2>Roles</h2><p>Reusable permission bundles managed by SurePlace.</p></div>
          <button class="primary" (click)="startNew()">Create role</button></div>
          @if (editing()) {
            <form class="editor" (ngSubmit)="saveRole()"><label>Role name<input name="roleName" [(ngModel)]="roleName" required maxlength="80"></label>
              <h3>Permissions</h3><div class="permission-list">
                @for (permission of data.permissions; track permission.key) {
                  <label class="permission"><input type="checkbox" [checked]="selected().has(permission.key)" (change)="togglePermission(permission.key, $event)">
                    <span><b>{{ permission.label }}</b><small>{{ permission.description }}</small></span></label>
                }
              </div><div class="actions"><button type="button" (click)="cancelEdit()">Cancel</button><button class="primary" [disabled]="saving() || !roleName.trim()">{{ saving() ? 'Saving…' : (editing() === 'new' ? 'Create role' : 'Save role') }}</button></div>
            </form>
          } @else if (!data.roles.length) { <p class="empty">No staff roles yet. Create one to begin assigning scoped access.</p> }
          @else { <div class="role-list">@for (role of data.roles; track role.id) {
            <article class="role"><div><h3>{{ role.name }}</h3><p>{{ permissionLabels(role, data) }}</p></div><div class="actions"><button (click)="editRole(role)">Edit</button><button class="danger" (click)="deleteRole(role)">{{ deleting() === role.id ? 'Confirm delete' : 'Delete' }}</button></div></article>
          }</div> }
        </section>
        <section class="panel"><div class="section-head"><div><h2>Staff assignments</h2><p>Only existing staff accounts can receive roles here.</p></div></div>
          @if (!data.staff.length) { <p class="empty">No eligible staff accounts found.</p> }
          @else { @for (person of data.staff; track person.id) {
            <article class="staff-row"><div class="person"><b>{{ person.name || person.email }}</b><small>{{ person.email }}</small></div>
              <div class="assignment">@for (role of data.roles; track role.id) {
                <label><input type="checkbox" [checked]="assigned(person.id, role.id)" (change)="toggleAssignment(person.id, role.id, $event)">{{ role.name }}</label>
              }</div><button class="save-assignment" [disabled]="savingUser() === person.id || sameAssignments(person.id)" (click)="saveAssignments(person.id)">{{ savingUser() === person.id ? 'Saving…' : 'Save' }}</button>
            </article>
          } }
          <p class="note">The superuser account is never changed by this screen. Staff permissions are enforced by the API.</p>
        </section>
      </div>
    }
  `,
  styles: [`
    :host{display:block;color:var(--midnight)}.page-head{margin:0 0 1.25rem}.eyebrow{font-size:.7rem;font-weight:800;letter-spacing:.09em;color:var(--teal)}h1{margin:.2rem 0;font-size:clamp(1.6rem,3vw,2.2rem)}p{color:var(--slate);margin:.35rem 0}.access-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1rem;align-items:start}.panel{background:#fff;border:1px solid var(--line);border-radius:1rem;padding:1.25rem;box-shadow:0 5px 20px #12352b08}.section-head{display:flex;justify-content:space-between;align-items:start;gap:1rem;margin-bottom:1rem}h2{font-size:1.15rem;margin:0}h3{font-size:.98rem;margin:0 0 .3rem}.section-head p,.role p,.person small,.permission small{font-size:.82rem}.primary,.actions button,.save-assignment,.state button{border:1px solid #cddbd8;border-radius:.55rem;background:white;color:var(--midnight);padding:.55rem .8rem;font-weight:700;cursor:pointer;transition:transform .15s,background .15s,box-shadow .15s}.primary{background:var(--teal);color:white;border-color:var(--teal)}button:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px #102b251f}button:disabled{opacity:.55;cursor:wait}.editor{border-top:1px solid var(--line);padding-top:1rem}.editor>label{display:grid;gap:.4rem;font-weight:700}.editor input:not([type=checkbox]){padding:.7rem;border:1px solid var(--line);border-radius:.5rem}.permission-list{display:grid;gap:.55rem;max-height:390px;overflow:auto;margin: .7rem 0 1rem}.permission{display:flex;gap:.65rem;align-items:flex-start;padding:.7rem;border:1px solid var(--line);border-radius:.55rem}.permission span{display:grid;gap:.15rem}.permission small,.note{color:var(--slate);line-height:1.4}.actions{display:flex;gap:.5rem}.role-list{display:grid;gap:.65rem}.role,.staff-row{padding:.85rem 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:.8rem}.role p{max-width:340px}.danger{color:#a43737!important;border-color:#eacaca!important}.person{min-width:145px;display:grid;gap:.2rem}.assignment{flex:1;display:flex;flex-wrap:wrap;gap:.5rem 1rem}.assignment label{display:flex;align-items:center;gap:.35rem;font-size:.8rem}.save-assignment{white-space:nowrap}.empty,.state{padding:1rem;color:var(--slate)}.note{font-size:.76rem;border-top:1px solid var(--line);padding-top:.8rem;margin-top:.8rem}@media(max-width:1000px){.access-grid{grid-template-columns:1fr}}@media(max-width:620px){.staff-row{align-items:flex-start;flex-direction:column}.assignment{width:100%}.section-head{flex-direction:column}}
  `],
})
export class StaffAccessComponent {
  private api = inject(StaffApiService);
  private toast = inject(ToastService);
  state = signal<StaffAccessState | null>(null);
  loading = signal(true);
  error = signal('');
  saving = signal(false);
  savingUser = signal('');
  editing = signal<number | 'new' | null>(null);
  deleting = signal<number | null>(null);
  roleName = '';
  selected = signal(new Set<string>());
  pending = signal<Record<string, number[]>>({});

  constructor() { this.load(); }
  load() { this.loading.set(true); this.error.set(''); this.api.staffAccess().pipe(finalize(() => this.loading.set(false))).subscribe({next: (data) => { this.state.set(data); this.pending.set(Object.fromEntries(data.staff.map((s) => [s.id, [...s.role_ids]]))); }, error: () => this.error.set('Could not load staff roles. Confirm your administrator access and try again.')}); }
  startNew() { this.roleName = ''; this.selected.set(new Set()); this.editing.set('new'); }
  editRole(role: StaffRole) { this.roleName = role.name; this.selected.set(new Set(role.permissions)); this.editing.set(role.id); }
  cancelEdit() { this.editing.set(null); }
  togglePermission(key: string, event: Event) { const next = new Set(this.selected()); if ((event.target as HTMLInputElement).checked) next.add(key); else next.delete(key); this.selected.set(next); }
  saveRole() { const current = this.editing(); if (current === null || !this.roleName.trim()) return; this.saving.set(true); const body = { name: this.roleName.trim(), permissions: [...this.selected()] }; const request = current === 'new' ? this.api.createStaffRole(body) : this.api.updateStaffRole(current, body); request.pipe(finalize(() => this.saving.set(false))).subscribe({next: () => { this.toast.show({kind:'success', message: current === 'new' ? 'Staff role created.' : 'Staff role updated.'}); this.editing.set(null); this.load(); }, error: () => this.toast.show({kind:'error', message:'The role could not be saved.'})}); }
  permissionLabels(role: StaffRole, data: StaffAccessState) { return role.permissions.map((key) => data.permissions.find((p) => p.key === key)?.label).filter(Boolean).join(' · ') || 'No permissions'; }
  assigned(userId: string, roleId: number) { return (this.pending()[userId] ?? []).includes(roleId); }
  toggleAssignment(userId: string, roleId: number, event: Event) { const all = {...this.pending()}; const ids = new Set(all[userId] ?? []); if ((event.target as HTMLInputElement).checked) ids.add(roleId); else ids.delete(roleId); all[userId] = [...ids]; this.pending.set(all); }
  sameAssignments(userId: string) { const user = this.state()?.staff.find((item) => item.id === userId); return !!user && [...user.role_ids].sort().join(',') === [...(this.pending()[userId] ?? [])].sort().join(','); }
  saveAssignments(userId: string) { this.savingUser.set(userId); this.api.updateStaffUserRoles(userId, this.pending()[userId] ?? []).pipe(finalize(() => this.savingUser.set(''))).subscribe({next: () => { this.toast.show({kind:'success', message:'Staff role assignments updated.'}); this.load(); }, error: () => this.toast.show({kind:'error', message:'Assignments were not updated.'})}); }
  deleteRole(role: StaffRole) { if (this.deleting() === role.id) { this.saving.set(true); this.api.deleteStaffRole(role.id).pipe(finalize(() => this.saving.set(false))).subscribe({next: () => { this.deleting.set(null); this.toast.show({kind:'success', message:'Staff role deleted.'}); this.load(); }, error: () => this.toast.show({kind:'error', message:'Role could not be deleted.'})}); return; } this.deleting.set(role.id); this.toast.show({kind:'warning', message:`Click Delete again to remove “${role.name}”.`}); }
}

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<section class="denied"><span class="eyebrow">LIMITED ACCESS</span><h1>You don’t have access to this workspace</h1><p>Your staff role doesn’t include the permission needed for this page. Contact a SurePlace administrator if you need access.</p><a routerLink="/staff">Return to staff overview</a></section>`,
  styles: [`:host{display:block}.denied{max-width:680px;margin:3rem auto;padding:2.5rem;background:white;border:1px solid var(--line);border-radius:1rem}.eyebrow{color:var(--teal);font-size:.7rem;font-weight:800;letter-spacing:.1em}h1{color:var(--midnight)}p{color:var(--slate);line-height:1.6}a{color:var(--teal);font-weight:700}`],
})
export class StaffAccessDeniedComponent {}
