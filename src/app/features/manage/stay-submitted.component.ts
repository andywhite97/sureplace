import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { StayManagementApiService } from '../../core/api/manage-api.services';
import { ManagedStay } from '../../core/models/manage.models';
import { SmartImageComponent } from '../../shared/ui/smart-image.component';

@Component({
  standalone: true,
  imports: [RouterLink, DatePipe, SmartImageComponent],
  template: `<section class="submission">
    @if (error()) {
      <p role="alert">{{ error() }}</p>
      <button (click)="load()">Retry</button>
    } @else if (stay(); as listing) {
      <span class="badge">Pending review</span>
      <h1>Stay submitted!</h1>
      <p>
        Your stay is now pending SurePlace review. We'll notify you if it is approved or if changes
        are needed.
      </p>
      @if (listing.submitted_at) {
        <p>Submitted {{ listing.submitted_at | date: 'medium' }}</p>
      }
      <nav aria-label="After submission">
        <a class="primary" routerLink="/account/manage/stays">Go to My Stays</a>
        <a routerLink="/account/manage/stays/new">Add Another Stay</a>
        <button (click)="preview.set(!preview())">
          {{ preview() ? 'Close preview' : 'Preview Stay' }}
        </button>
      </nav>
      @if (preview()) {
        <article>
          <h2>{{ listing.name }}</h2>
          <p>{{ listing.town }}, {{ listing.region }}</p>
          <p>{{ listing.description }}</p>
          @for (room of listing.room_types; track room.id) {
            <div class="room">
              <sp-image
                [src]="room.images[0]?.image || null"
                [alt]="room.name"
                ratio="4 / 3"
              /><strong>{{ room.name }}</strong
              ><span>{{ room.currency }} {{ room.base_price }} / night</span>
            </div>
          }
        </article>
      }
    } @else {
      <p role="status">Checking submission...</p>
    }
  </section>`,
  styles: [
    `
      .submission {
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        background: white;
        border: 1px solid var(--line);
        border-radius: 1rem;
      }
      h1 {
        color: var(--midnight);
      }
      p {
        color: var(--slate);
        line-height: 1.6;
      }
      .badge {
        color: #8a5a00;
        background: #fff4dd;
        padding: 0.4rem 0.7rem;
        border-radius: 2rem;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.7rem;
        margin: 1.5rem 0;
      }
      a,
      button {
        padding: 0.7rem 1rem;
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        background: white;
        color: var(--midnight);
        font: inherit;
        text-decoration: none;
        cursor: pointer;
      }
      .primary {
        background: var(--teal);
        color: white;
      }
      .room {
        display: grid;
        gap: 0.6rem;
        margin: 1rem 0;
        max-width: 320px;
      }
    `,
  ],
})
export class StaySubmittedComponent {
  private api = inject(StayManagementApiService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  stay = signal<ManagedStay | null>(null);
  error = signal('');
  preview = signal(false);
  constructor() {
    this.load();
  }
  load() {
    this.error.set('');
    this.api
      .detail(this.route.snapshot.paramMap.get('id')!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stay) => {
          if (['SUBMITTED', 'UNDER_REVIEW'].includes(stay.status)) this.stay.set(stay);
          else void this.router.navigate(['/account/manage/stays']);
        },
        error: () => this.error.set('Could not load your submission. Please try again.'),
      });
  }
}
