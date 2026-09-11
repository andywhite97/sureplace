import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type ListingKind = 'property' | 'stay';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="wizard-page">
    <section class="wizard-card choice-card">
      <a class="back-link" routerLink="/account/manage">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
        Back
      </a>
      <p class="eyebrow">List with SurePlace</p>
      <h1>List on SurePlace</h1>
      <p class="lead">Choose what you want to list to get started.</p>

      <div class="kind-grid" role="radiogroup" aria-label="Listing type">
        <button
          type="button"
          [class.selected]="selected() === 'property'"
          (click)="selected.set('property')"
          role="radio"
          [attr.aria-checked]="selected() === 'property'"
        >
          <span><i class="fa-solid fa-house" aria-hidden="true"></i></span>
          <strong>Property</strong>
          <small>Homes, apartments, land, commercial spaces and more.</small>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
        <button
          type="button"
          [class.selected]="selected() === 'stay'"
          (click)="selected.set('stay')"
          role="radio"
          [attr.aria-checked]="selected() === 'stay'"
        >
          <span><i class="fa-solid fa-bed" aria-hidden="true"></i></span>
          <strong>Stay</strong>
          <small>Guest houses, hotels, lodges, B&amp;Bs, self-catering and more.</small>
          <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
        </button>
      </div>

      <p class="support">Join a trusted property community in Eswatini. List with confidence.</p>
      <a class="primary-cta" [routerLink]="target()">
        Continue
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      </a>
    </section>
  </main>`,
  styleUrl: './listing-wizard.scss',
})
export class ListingTypeChoiceComponent {
  selected = signal<ListingKind>('property');

  target() {
    return this.selected() === 'property'
      ? '/account/manage/properties/new'
      : '/account/manage/stays/new';
  }
}
