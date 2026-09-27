import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, startWith } from 'rxjs';

import { AgentsApiService, AgentListItem } from '../../core/api/agents-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { MessagingApiService } from '../../core/api/messaging-api.service';
import { ReferenceApiService } from '../../core/api/reference-api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'sp-agents',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="agents-page">
      <header class="page-header">
        <div>
          <p class="eyebrow">Trusted professionals</p>
          <h1>Find an agent</h1>
          <p class="subtitle">Connect with trusted property professionals across Eswatini.</p>
        </div>
      </header>

      <div class="toolbar panel">
        <div class="toolbar-heading">
          <div>
            <span class="toolbar-kicker"><i class="fa-solid fa-compass" aria-hidden="true"></i> Agent directory</span>
            <p>Search by person, agency or the area you want to call home.</p>
          </div>
          <span class="directory-mark"><i class="fa-solid fa-user-check" aria-hidden="true"></i></span>
        </div>
        <label class="search-field">
          <span class="sr-only">Search agents</span>
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input
            [formControl]="form.controls.search"
            type="search"
            placeholder="Search by agent name, agency or town..."
          />
        </label>

        <div class="filters">
          <label>
            <span>Region</span>
            <select [formControl]="form.controls.region">
              <option value="">All regions</option>
              @for (region of regions(); track region.value) {
                <option [value]="region.value">{{ region.label }}</option>
              }
            </select>
          </label>

          <label>
            <span>Town</span>
            <select [formControl]="form.controls.town">
              <option value="">All towns</option>
              @for (town of towns(); track town) {
                <option [value]="town">{{ town }}</option>
              }
            </select>
          </label>

          <label>
            <span>Agency</span>
            <select [formControl]="form.controls.agency">
              <option value="">All agencies</option>
              @for (agency of agencies(); track agency.id) {
                <option [value]="agency.id">{{ agency.name }}</option>
              }
            </select>
          </label>

          <label class="check">
            <input type="checkbox" [formControl]="form.controls.verifiedOnly" />
            <span>Verified only</span>
          </label>

          <label>
            <span>Sort</span>
            <select [formControl]="form.controls.ordering">
              <option value="relevance">Relevance</option>
              <option value="name">Name A–Z</option>
              <option value="active">Most active</option>
              <option value="newest">Newest</option>
            </select>
          </label>
        </div>
      </div>

      @if (loading()) {
        <div class="grid loading-grid" aria-live="polite" aria-busy="true">
          @for (item of [1,2,3,4,5,6]; track item) {
            <div class="agent-card skeleton-card">
              <div class="avatar skeleton"></div>
              <div class="skeleton line short"></div>
              <div class="skeleton line"></div>
              <div class="skeleton line tiny"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="empty-state panel">
          <h2>We could not load agents right now.</h2>
          <p>Please try again in a moment.</p>
          <button type="button" class="primary" (click)="reload()">Retry</button>
        </div>
      } @else if (agents().length === 0) {
        <div class="empty-state panel">
          <h2>No agents found</h2>
          <p>Try adjusting your filters or search.</p>
          <button type="button" class="secondary" (click)="clearFilters()">Clear filters</button>
        </div>
      } @else {
        <div class="meta-row">
          <p class="result-count">{{ count() }} {{ count() === 1 ? 'agent' : 'agents' }} found</p>
        </div>

        <div class="grid">
          @for (agent of agents(); track agent.id) {
            <article class="agent-card">
              <div class="card-top">
                <div class="avatar-wrap">
                  @if (agent.avatar) {
                    <img [src]="agent.avatar" [alt]="agent.name" />
                  } @else {
                    <div class="avatar-fallback">{{ initials(agent.name) }}</div>
                  }
                </div>

                <div class="identity">
                  <h2>{{ agent.name }}</h2>
                  @if (agent.verified_agent) {
                    <span class="badge verified-agent"><i class="fa-solid fa-check"></i> Verified Agent</span>
                  }
                </div>
              </div>

              <div class="agency-row">
                <span class="agency-name">{{ agent.agency?.name || 'Independent agent' }}</span>
                @if (agent.verified_agency && agent.agency) {
                  <span class="badge verified-agency"><i class="fa-solid fa-shield-check"></i> Verified Agency</span>
                }
              </div>

              <p class="service-areas">{{ serviceAreas(agent) }}</p>

              <div class="stats-row">
                <span><i class="fa-solid fa-building"></i> {{ agent.active_listings_count }} active listings</span>
              </div>

              @if (agent.bio) {
                <p class="bio">{{ agent.bio }}</p>
              }

              <div class="actions">
                <a class="primary" [routerLink]="['/agents', agent.id]">View profile</a>
                <button type="button" class="secondary" (click)="message(agent)">
                  <i class="fa-solid fa-message"></i> Message
                </button>
              </div>
            </article>
          }
        </div>

        @if (nextUrl() || previousUrl()) {
          <div class="pagination">
            <button type="button" [disabled]="!previousUrl()" (click)="page(previousPage())">Previous</button>
            <button type="button" [disabled]="!nextUrl()" (click)="page(nextPage())">Next</button>
          </div>
        }
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .agents-page { max-width: 1280px; margin: 0 auto; padding: 2.4rem 1rem 4.5rem; color: var(--midnight); }
    .page-header { position:relative; overflow:hidden; margin:0 0 1.15rem; padding:2.25rem 2rem; border-radius:1.35rem; background:linear-gradient(90deg, rgba(9,41,39,.88) 0%, rgba(9,41,39,.68) 53%, rgba(9,41,39,.18) 100%), url('/hero-eswatini-home.jpg') center/cover; border:1px solid rgba(15,157,131,.2); }
    .page-header::after { content:'Local expertise. Stronger communities.'; position:absolute; right:2rem; bottom:1.55rem; color:rgba(255,255,255,.9); font-size:.92rem; font-style:italic; transform:rotate(-4deg); }
    .page-header > div { position:relative; z-index:1; }
    .eyebrow { letter-spacing: .13em; font-size: .72rem; text-transform: uppercase; color:#6ce5d2; font-weight: 800; margin: 0 0 .55rem; }
    h1 { margin: 0; color:#fff; letter-spacing:-.04em; font-size: clamp(2.2rem, 4vw, 3.5rem); }
    .subtitle { max-width:37rem; margin: .65rem 0 0; color:rgba(255,255,255,.9); font-size: 1.06rem; line-height:1.55; }
    .panel { background: rgba(255,255,255,.9); border: 1px solid rgba(21,43,42,.08); border-radius: 1.15rem; box-shadow: 0 16px 38px rgba(21,43,42,.07); }
    .toolbar { padding: 1.15rem; display: grid; gap: 1rem; }
    .toolbar-heading { display:flex; align-items:center; justify-content:space-between; gap:1rem; }
    .toolbar-kicker { display:inline-flex; align-items:center; gap:.45rem; color:var(--teal); font-size:.78rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em; }
    .toolbar-heading p { margin:.28rem 0 0; color:var(--slate); font-size:.9rem; }
    .directory-mark { width:2.5rem; height:2.5rem; display:grid; place-items:center; border-radius:.8rem; color:var(--teal); background:rgba(15,157,131,.1); }
    .search-field { display: flex; align-items: center; gap: .75rem; background: #fff; border: 1px solid rgba(21,43,42,.12); border-radius: .9rem; padding: .9rem 1rem; box-shadow:inset 0 1px 0 rgba(21,43,42,.03); }
    .search-field:focus-within { border-color:rgba(15,157,131,.75); box-shadow:0 0 0 3px rgba(15,157,131,.12); }
    .search-field input { flex: 1; border: 0; background: transparent; font: inherit; color: var(--midnight); }
    .search-field i { color: var(--slate); }
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .75rem; }
    .filters label { display: grid; gap: .35rem; font-size: .78rem; color: var(--slate); }
    .filters select, .filters input { background: #fff; border: 1px solid rgba(21,43,42,.12); border-radius: .75rem; padding: .7rem .8rem; font: inherit; color: var(--midnight); }
    .filters select:focus, .filters input:focus { outline:2px solid rgba(15,157,131,.25); outline-offset:1px; border-color:var(--teal); }
    .check { align-self: end; background: #fff; border: 1px solid rgba(21,43,42,.12); border-radius: .75rem; padding: .78rem .8rem; display: flex; align-items: center; gap: .5rem; }
    .check input { accent-color: var(--teal); }
    .meta-row { display: flex; justify-content: flex-end; margin: 1rem 0 .7rem; }
    .result-count { margin:0; padding:.38rem .7rem; border-radius:999px; background:rgba(15,157,131,.09); color:var(--teal); font-size:.82rem; font-weight:800; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .agent-card { position:relative; overflow:hidden; background: #fff; border: 1px solid rgba(21,43,42,.08); border-radius: 1rem; padding: 1.1rem; display: flex; flex-direction: column; gap: .78rem; min-height: 100%; box-shadow:0 8px 20px rgba(21,43,42,.035); transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
    .agent-card::before { content:''; position:absolute; top:0; left:1.1rem; right:1.1rem; height:3px; border-radius:0 0 99px 99px; background:linear-gradient(90deg, var(--teal), #6ad9c9); opacity:0; transition:opacity .2s ease; }
    .agent-card:hover { transform:translateY(-3px); border-color:rgba(15,157,131,.25); box-shadow:0 16px 30px rgba(21,43,42,.1); }
    .agent-card:hover::before { opacity:1; }
    .card-top { display: flex; gap: .8rem; align-items: center; }
    .avatar-wrap { flex-shrink: 0; }
    .avatar-fallback, .avatar-wrap img { width: 3.35rem; height: 3.35rem; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, rgba(15,157,131,.18), rgba(40,120,208,.16)); color: var(--midnight); font-weight: 800; box-shadow:0 0 0 4px rgba(15,157,131,.07); }
    .avatar-wrap img { object-fit: cover; }
    .identity { min-width: 0; }
    .identity h2 { margin: 0; font-size: 1.05rem; }
    .badge { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .5rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
    .verified-agent { background: rgba(40,120,208,.12); color: var(--verification); }
    .verified-agency { background: rgba(15,157,131,.12); color: var(--teal); }
    .agency-row { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
    .agency-name { font-weight: 750; }
    .service-areas, .bio, .stats-row { color: var(--slate); }
    .service-areas { margin: 0; line-height: 1.4; }
    .stats-row { font-size: .86rem; }
    .bio { margin: 0; line-height: 1.5; }
    .actions { display: flex; gap: .5rem; margin-top: auto; }
    a.primary, button.primary, button.secondary { border-radius: .8rem; border: 1px solid transparent; padding: .72rem .9rem; font-weight: 750; cursor: pointer; }
    a.primary, button.primary { background: linear-gradient(135deg, var(--teal), #078e82); color: #fff; text-decoration: none; box-shadow:0 7px 14px rgba(15,157,131,.18); }
    button.secondary { background: #fff; border-color: rgba(21,43,42,.12); color: var(--midnight); }
    .pagination { display: flex; justify-content: center; gap: .75rem; margin-top: 1.25rem; }
    .empty-state { padding: 2rem; text-align: center; }
    .empty-state h2 { margin-top: 0; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
    .skeleton-card { padding: 1rem; }
    .skeleton { position: relative; overflow: hidden; background: rgba(100,116,113,.12); border-radius: .7rem; }
    .skeleton::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); animation: shimmer 1.2s infinite; }
    .skeleton.avatar { width: 3.2rem; height: 3.2rem; border-radius: 50%; }
    .skeleton.line { height: .9rem; margin: .35rem 0; }
    .skeleton.line.short { width: 60%; }
    .skeleton.line.tiny { width: 35%; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    @media (max-width: 980px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 640px) { .page-header { padding:1.65rem 1.25rem; border-radius:1rem; } .toolbar-heading p { font-size:.82rem; } .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .actions { flex-direction: column; } .page-header { margin-bottom: 1rem; } }
    @media (max-width: 430px) { .agents-page { padding-inline:.7rem; } .grid { gap:.6rem; } .agent-card { padding:.7rem; gap:.55rem; } .avatar-fallback, .avatar-wrap img { width:2.65rem; height:2.65rem; } .identity h2 { font-size:.88rem; } .badge { font-size:.61rem; padding:.16rem .35rem; } .agency-name, .service-areas, .stats-row { font-size:.72rem; } .bio { display:none; } .actions { flex-direction:row; gap:.35rem; } a.primary, button.primary, button.secondary { padding:.55rem .35rem; font-size:.7rem; flex:1; } .filters { grid-template-columns: 1fr; } }
  `,
})
export class AgentsComponent {
  private api = inject(AgentsApiService);
  private auth = inject(AuthService);
  private messaging = inject(MessagingApiService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toast = inject(ToastService);
  private refs = inject(ReferenceApiService);

  form = this.fb.nonNullable.group({
    search: [''],
    region: [''],
    town: [''],
    agency: [''],
    verifiedOnly: [false],
    ordering: ['relevance'],
  });

  agents = signal<AgentListItem[]>([]);
  count = signal(0);
  loading = signal(true);
  error = signal(false);
  nextUrl = signal<string | null>(null);
  previousUrl = signal<string | null>(null);
  filters = signal<Record<string, unknown>>({});

  regions = computed(() => this.refs.data().regions ?? []);
  towns = computed(() => {
    const region = this.form.controls.region.value;
    const all = this.refs.data().regions ?? [];
    if (!region) return Array.from(new Set((all.flatMap((item) => item.areas ?? []) as string[]))).sort();
    const match = all.find((item) => item.value === region);
    return match?.areas ?? [];
  });
  agencies = computed(() => {
    const items = this.agents();
    const values = new Map<string, { id: string; name: string }>();
    items.forEach((agent) => {
      if (agent.agency) {
        values.set(agent.agency.id, { id: agent.agency.id, name: agent.agency.name });
      }
    });
    return Array.from(values.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  constructor() {
    effect(() => {
      const region = this.form.controls.region.value;
      if (!region) return;
      const town = this.form.controls.town.value;
      if (town && !this.towns().includes(town)) {
        this.form.controls.town.setValue('');
      }
    });

    this.form.valueChanges
      .pipe(startWith(this.form.getRawValue()), debounceTime(250), distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)))
      .subscribe(() => this.load());

    this.refs.load().subscribe();
    this.load();
  }

  load(page = 1) {
    const values = this.form.getRawValue();
    const params: Record<string, string | string[] | null | undefined> = {
      page: String(page),
      search: values.search || undefined,
      region: values.region || undefined,
      town: values.town || undefined,
      agency: values.agency || undefined,
      verified: values.verifiedOnly ? 'true' : undefined,
      ordering: values.ordering || 'relevance',
    };

    this.loading.set(true);
    this.error.set(false);
    this.api
      .list(params)
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of({ count: 0, next: null, previous: null, results: [] });
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((pageResult) => {
        this.agents.set(pageResult.results ?? []);
        this.count.set(pageResult.count ?? 0);
        this.nextUrl.set(pageResult.next ?? null);
        this.previousUrl.set(pageResult.previous ?? null);
      });
  }

  clearFilters() {
    this.form.reset({ search: '', region: '', town: '', agency: '', verifiedOnly: false, ordering: 'relevance' });
    this.load();
  }

  reload() {
    this.load();
  }

  page(url: string | null) {
    if (!url) return;
    const query = new URL(url, window.location.origin).searchParams;
    this.load(Number(query.get('page') ?? 1));
  }

  nextPage() {
    const next = this.nextUrl();
    if (!next) return null;
    return new URL(next, window.location.origin).searchParams.get('page');
  }

  previousPage() {
    const prev = this.previousUrl();
    if (!prev) return null;
    return new URL(prev, window.location.origin).searchParams.get('page');
  }

  serviceAreas(agent: AgentListItem) {
    return (agent.service_areas && agent.service_areas.length ? agent.service_areas : ['Eswatini']).slice(0, 3).join(' · ');
  }

  initials(name: string) {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'A';
  }

  message(agent: AgentListItem) {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/agents/${agent.id}` } });
      return;
    }
    this.messaging.createForAgent(agent.id, `Hi ${agent.name}, I'd like to discuss a property opportunity.`).subscribe({
      next: (conversation) => void this.router.navigate(['/account/messages', conversation.id]),
      error: () => this.toast.show('Could not start the conversation.', 'error'),
    });
  }
}
