import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserCapabilityService } from '../../core/services/user-capability.service';

type ListingKind = 'property' | 'stay';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="wizard-page">
    <section class="wizard-card choice-card">
      <a class="back-link" routerLink="/account/manage" queryParamsHandling="preserve">
        <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
        Back
      </a>
      <p class="eyebrow">List with SurePlace</p>
      <h1>List on SurePlace</h1>
      <p class="lead">Choose what you want to list to get started.</p>

      <div class="kind-grid" role="radiogroup" aria-label="Listing type">
        @if (capabilities.capabilities().canCreatePropertyListing) {
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
        }
        @if (capabilities.capabilities().canCreateStayListing) {
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
        }
      </div>

      @if (canCreateIndependently()) {
        <p class="support">Join a trusted property community in Eswatini. List with confidence.</p>
        <a class="primary-cta" [routerLink]="target()" queryParamsHandling="preserve">
          Continue
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      } @else if (capabilities.capabilities().canCreateAgency) {
        <p class="support">Create an agency to continue your listing journey.</p>
        <a class="primary-cta" routerLink="/account/manage/agency/create">
          Create an agency
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
      }
    </section>
  </main>`,
  styleUrl: './listing-wizard.scss',
})
export class ListingTypeChoiceComponent {
  readonly capabilities = inject(UserCapabilityService);
  selected = signal<ListingKind>('property');
  canCreateIndependently = computed(() => {
    const access = this.capabilities.capabilities();
    return access.canCreatePropertyListing || access.canCreateStayListing;
  });

  target() {
    const access = this.capabilities.capabilities();
    if (!access.canCreatePropertyListing && access.canCreateStayListing)
      return '/account/manage/stays/new';
    if (!access.canCreateStayListing && access.canCreatePropertyListing)
      return '/account/manage/properties/new';
    return this.selected() === 'property'
      ? '/account/manage/properties/new'
      : '/account/manage/stays/new';
  }
}
