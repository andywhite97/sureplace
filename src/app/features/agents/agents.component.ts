import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, startWith } from 'rxjs';

import { AgentsApiService, AgentListItem } from '../../core/api/agents-api.service';
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
                <a class="primary" [routerLink]="['/agents', agent.slug || agent.id]">View profile</a>
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
    .agents-page { max-width: 1280px; margin: 0 auto; padding: 2rem 1rem 4rem; color: var(--midnight); }
    .page-header { margin-bottom: 1.5rem; }
    .eyebrow { letter-spacing: .12em; font-size: .72rem; text-transform: uppercase; color: var(--teal); font-weight: 700; margin: 0 0 .5rem; }
    h1 { margin: 0; font-size: clamp(2rem, 4vw, 3.25rem); }
    .subtitle { margin: .6rem 0 0; color: var(--slate); font-size: 1.05rem; }
    .panel { background: rgba(255,255,255,.85); border: 1px solid rgba(21,43,42,.08); border-radius: 1rem; box-shadow: 0 10px 30px rgba(21,43,42,.04); }
    .toolbar { padding: 1rem; display: grid; gap: 1rem; }
    .search-field { display: flex; align-items: center; gap: .75rem; background: #fff; border: 1px solid rgba(21,43,42,.12); border-radius: .9rem; padding: .8rem 1rem; }
    .search-field input { flex: 1; border: 0; background: transparent; font: inherit; color: var(--midnight); }
    .search-field i { color: var(--slate); }
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .75rem; }
    .filters label { display: grid; gap: .35rem; font-size: .78rem; color: var(--slate); }
    .filters select, .filters input { background: #fff; border: 1px solid rgba(21,43,42,.12); border-radius: .75rem; padding: .7rem .8rem; font: inherit; color: var(--midnight); }
    .check { align-self: end; background: #fff; border: 1px solid rgba(21,43,42,.12); border-radius: .75rem; padding: .78rem .8rem; display: flex; align-items: center; gap: .5rem; }
    .check input { accent-color: var(--teal); }
    .meta-row { display: flex; justify-content: flex-end; margin: 1rem 0 .5rem; }
    .result-count { margin: 0; color: var(--slate); font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    .agent-card { background: #fff; border: 1px solid rgba(21,43,42,.08); border-radius: 1rem; padding: 1rem; display: flex; flex-direction: column; gap: .75rem; min-height: 100%; }
    .card-top { display: flex; gap: .8rem; align-items: center; }
    .avatar-wrap { flex-shrink: 0; }
    .avatar-fallback, .avatar-wrap img { width: 3.2rem; height: 3.2rem; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, rgba(15,157,131,.18), rgba(40,120,208,.16)); color: var(--midnight); font-weight: 800; }
    .avatar-wrap img { object-fit: cover; }
    .identity { min-width: 0; }
    .identity h2 { margin: 0; font-size: 1.05rem; }
    .badge { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .5rem; border-radius: 999px; font-size: .72rem; font-weight: 700; }
    .verified-agent { background: rgba(40,120,208,.12); color: var(--verification); }
    .verified-agency { background: rgba(15,157,131,.12); color: var(--teal); }
    .agency-row { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
    .agency-name { font-weight: 700; }
    .service-areas, .bio, .stats-row { color: var(--slate); }
    .service-areas { margin: 0; line-height: 1.4; }
    .stats-row { font-size: .86rem; }
    .bio { margin: 0; line-height: 1.5; }
    .actions { display: flex; gap: .5rem; margin-top: auto; }
    a.primary, button.primary, button.secondary { border-radius: .8rem; border: 1px solid transparent; padding: .7rem .9rem; font-weight: 700; cursor: pointer; }
    a.primary, button.primary { background: var(--teal); color: #fff; text-decoration: none; }
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
    @media (max-width: 640px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .actions { flex-direction: column; } .page-header { margin-bottom: 1rem; } }
    @media (max-width: 430px) { .grid { grid-template-columns: 1fr; } .filters { grid-template-columns: 1fr; } }
  `,
})
export class AgentsComponent {
  private api = inject(AgentsApiService);
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
    if (!this.router.navigated) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: `/agents/${agent.slug || agent.id}` } });
      return;
    }
    void this.router.navigate(['/account/messages']);
    this.toast.show('Open the message centre to continue the conversation.', 'info');
  }
}
