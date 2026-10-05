import { Component, input } from '@angular/core';
import { PropertyAdvertiser } from '../../core/models/listing.models';
import { ProfileImageComponent } from '../ui/profile-image.component';

@Component({
  selector: 'sp-listing-identity',
  standalone: true,
  imports: [ProfileImageComponent],
  template: `@if (identity(); as person) {
    <div class="identity" [attr.aria-label]="person.role">
      <sp-profile-image [src]="person.image" [name]="person.name" [agency]="person.kind === 'AGENCY'" />
      <span>{{ person.name }}</span>
    </div>
    @if (person.representative_name; as name) {
      <div class="identity representative">
        <sp-profile-image [src]="person.representative_image" [name]="name" />
        <span>{{ name }} · Agent</span>
      </div>
    }
  }`,
  styles: [`:host{display:grid;gap:.3rem}.identity{display:flex;align-items:center;gap:.45rem;font-size:.78rem;font-weight:700;min-width:0}.identity span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.representative{font-weight:500}.representative sp-profile-image{--profile-image-size:1.5rem}`],
})
export class ListingIdentityComponent {
  identity = input<PropertyAdvertiser | null | undefined>(null);
}
