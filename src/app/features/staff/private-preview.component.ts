import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { DOCUMENT, JsonPipe } from '@angular/common';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize, switchMap, map } from 'rxjs';
import { UserCapabilityService } from '../../core/services/user-capability.service';
import { OnboardingApi, PreviewContent } from '../../core/api/onboarding-api.service';
import { SeoService } from '../../core/services/seo.service';
import { normalizeApiError } from '../../core/api/error-normalizer';

@Component({
  standalone: true,
  imports: [],
  template: `<main>
    <p class="banner">Private preview — not yet published</p>
    @if (preview(); as p) {
      <h1>{{ p.business_name }}</h1>
      <p>{{ p.content['town'] }} · {{ p.content['region'] }}</p>
      <p>{{ p.notice }}</p>
      <div class="gallery">
        @for (image of p.images; track image.id) {
          <figure>
            <img [src]="image.data" [alt]="image.caption || 'Private business preview'" />
            <figcaption>{{ image.caption }}</figcaption>
          </figure>
        }
      </div>
      <h2>About this {{ p.kind === 'STAY' ? 'stay' : 'property' }}</h2>
      <p class="description">{{ p.content['description'] }}</p>
      @if (p.content['price']) {
        <p>Indicative price: {{ p.content['price'] }} SZL — not confirmed</p>
      }
      @for (room of rooms(); track $index) {
        <section>
          <h3>{{ room['name'] }}</h3>
          <p>Indicative nightly rate: {{ room['base_price'] || 'Not supplied' }} SZL</p>
          <p>Availability and amenities are not confirmed.</p>
        </section>
      }
      <p>
        Version {{ p.version }}. Send corrections to the SurePlace staff member who shared this
        link. Approval is recorded separately after identity and content rights are checked.
      </p>
    } @else {
      <h1>Private preview</h1>
      <p role="status">{{ message() }}</p>
    }
  </main>`,
  styles: [
    `
      main {
        max-width: 900px;
        margin: auto;
        padding: 1.25rem;
        overflow-wrap: anywhere;
      }
      .banner {
        background: #fff2cc;
        border: 1px solid #dec884;
        padding: 1rem;
        border-radius: 12px;
        font-weight: 700;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
        gap: 1rem;
      }
      figure {
        margin: 0;
      }
      img {
        width: 100%;
        height: 240px;
        object-fit: cover;
        border-radius: 14px;
      }
      .description {
        white-space: pre-wrap;
      }
      section {
        padding: 1rem;
        border: 1px solid #dbe5e3;
        border-radius: 12px;
        margin: 1rem 0;
      }
    `,
  ],
})
export class PrivatePreviewComponent {
  private api = inject(OnboardingApi);
  private doc = inject(DOCUMENT);
  private meta = inject(Meta);
  private route = inject(ActivatedRoute);
  preview = signal<PreviewContent | null>(null);
  message = signal('Loading preview…');
  rooms() {
    return (this.preview()?.content['room_types'] || []) as Record<string, unknown>[];
  }
  constructor() {
    inject(SeoService).set({
      title: 'Private preview',
      description: 'Private business preview. Not published.',
      path: '/private-preview',
      robots: 'noindex,nofollow,noarchive',
      image: null,
    });
    this.meta.updateTag({name:'robots',content:'noindex,nofollow,noarchive'});
    const previous = this.meta.getTag('name="referrer"')?.content;
    this.meta.updateTag({ name: 'referrer', content: 'no-referrer' });
    inject(DestroyRef).onDestroy(() => {
      if (previous) this.meta.updateTag({ name: 'referrer', content: previous });
      else this.meta.removeTag('name="referrer"');
    });
    afterNextRender(() => {
      const token = this.route.snapshot.fragment || '';
      this.doc.defaultView?.history.replaceState(
        this.doc.defaultView.history.state,
        '',
        this.doc.location.pathname,
      );
      if (!token) {
        this.message.set(
          'This link is invalid or has expired. Ask your SurePlace contact for a new preview.',
        );
        return;
      }
      this.api
        .preview(token)
        .subscribe({
          next: (p) => this.preview.set(p),
          error: () =>
            this.message.set(
              'This link is unavailable or has expired. Ask your SurePlace contact for a new preview.',
            ),
        });
    });
  }
}

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink, JsonPipe],
  template: `<main>
    <h1>Accept your business draft</h1>
    @if (claim(); as p) {
      <h2>{{ p.business_name }}</h2>
      <p>
        Review version {{ p.version }} before accepting. Acceptance creates a private draft for the
        ordinary verification and moderation process.
      </p>
      <p>{{ p.content['description'] }}</p>
      <details>
        <summary>Review all approved content</summary>
        <pre>{{ p.content | json }}</pre>
      </details>
      @if (p.images?.length) {
        <h3>Approved photos</h3>
        @for (photo of p.images;track photo.id) { <img [src]="photo.data" [alt]="photo.caption || 'Approved business photo'" style="width:100%;max-width:260px;border-radius:12px" /> }
        <label><input type="checkbox" [(ngModel)]="usePhotos" /> Add these approved photos to my listing draft. I understand that anyone with a direct listing image link may view them.</label>
        <p>Leave this unchecked to keep the preview photos private and add listing photos later.</p>
      }
      <label
        ><input type="checkbox" [(ngModel)]="rights" /> I have the right to manage this business and
        use its approved content and photos.</label
      >
      <button (click)="accept()" [disabled]="!rights || busy()">Accept and open draft</button>
    }
    <p role="status">{{ message() }}</p>
    <a routerLink="/account">Back to account</a>
  </main>`,
  styles: [
    `
      main {
        max-width: 760px;
        margin: auto;
        padding: 1.25rem;
      }
      pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      label {
        display: block;
        margin: 1rem 0;
      }
      button {
        padding: 0.75rem 1rem;
        border-radius: 8px;
      }
    `,
  ],
})
export class OnboardingClaimComponent {
  private capabilities = inject(UserCapabilityService);
  api = inject(OnboardingApi);
  router = inject(Router);
  id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  claim = signal<{
    business_name: string;
    kind: string;
    version: number;
    images?: {id:string;caption:string;data:string}[];
    status: string;
    content: Record<string, unknown>;
  } | null>(null);
  message = signal('Loading invitation…');
  busy = signal(false);
  rights = false;
  usePhotos = false;
  constructor() {
    this.api.claim(this.id).subscribe({
      next: (p) => {
        this.claim.set(p);
        this.message.set('');
      },
      error: () =>
        this.message.set(
          'This invitation is unavailable. Sign in with the verified invited email or contact SurePlace.',
        ),
    });
  }
  accept() {
    const p = this.claim();
    if (!p || !this.rights) return;
    this.busy.set(true);
    this.api
      .accept(this.id, p.version, this.usePhotos)
      .pipe(switchMap(result => this.capabilities.refresh().pipe(map(() => result))), finalize(() => this.busy.set(false)))
      .subscribe({
        next: (r) =>
          this.router.navigate([
            '/account/manage',
            r.kind === 'STAY' ? 'stays' : 'properties',
            r.listing_id,
            'edit',
          ]),
        error: (e) => {
          const err = normalizeApiError(e);
          this.message.set(
            err.message +
              ' ' +
              Object.values(err.errors || {})
                .flat()
                .join(' '),
          );
        },
      });
  }
}
