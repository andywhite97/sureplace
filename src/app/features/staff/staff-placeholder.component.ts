import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<section class="placeholder">
    <p class="eyebrow">Staff</p>
    <h1>{{ route.snapshot.data['title'] }}</h1>
    <p>{{ route.snapshot.data['message'] }}</p>
    <a routerLink="/staff/listings"
      ><i class="fa-solid fa-building-user" aria-hidden="true"></i> Review listings</a
    >
  </section>`,
  styles: [
    `
      .placeholder {
        min-height: 420px;
        display: grid;
        place-content: center;
        justify-items: center;
        gap: 0.7rem;
        text-align: center;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: #fff;
        padding: 2rem;
      }
      .eyebrow,
      h1,
      p {
        margin: 0;
      }
      .eyebrow {
        color: var(--teal);
        font-weight: 850;
        text-transform: uppercase;
      }
      p {
        max-width: 560px;
        color: var(--slate);
      }
      a {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        min-height: 42px;
        padding: 0 0.9rem;
        border-radius: var(--radius-sm);
        background: var(--teal);
        color: #fff;
        text-decoration: none;
        font-weight: 850;
      }
    `,
  ],
})
export class StaffPlaceholderComponent {
  route = inject(ActivatedRoute);
}
