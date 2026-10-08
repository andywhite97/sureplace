import { Component, input, output } from '@angular/core';
import { RoomAvailabilityResult, RoomTypeSummary } from '../../../core/models/listing.models';
import { SmartImageComponent } from '../../../shared/ui/smart-image.component';
import { formatMoney } from '../../../shared/listing/price-format';

@Component({
  selector: 'sp-room-card',
  standalone: true,
  imports: [SmartImageComponent],
  template: `<article [class.selected]="selected()">
    <div class="photo">
      <sp-image
        [src]="coverImage()"
        [alt]="room().name"
        ratio="4 / 3"
        [priority]="priority()"
        [width]="420"
        [height]="315"
      />
    </div>
    <div class="body">
      <div>
        <h3>{{ room().name }}</h3>
        @if (room().description) {
          <p>{{ room().description }}</p>
        }
      </div>
      <ul>
        <li>
          <i class="fa-solid fa-users" aria-hidden="true"></i>
          Up to {{ room().total_capacity }} guest{{ room().total_capacity === 1 ? '' : 's' }} per
          room
        </li>
        <li>
          <i class="fa-solid fa-bed" aria-hidden="true"></i>
          {{ room().number_of_beds }} bed{{ room().number_of_beds === 1 ? '' : 's' }}
          @if (room().bed_configuration) {
            <span aria-hidden="true">&middot;</span> {{ optionLabel(room().bed_configuration) }}
          }
        </li>
        @if (room().bathroom_type) {
          <li>
            <i class="fa-solid fa-bath" aria-hidden="true"></i
            >{{ optionLabel(room().bathroom_type) }} bathroom
          </li>
        }
        <li>
          <i class="fa-solid fa-moon" aria-hidden="true"></i>
          {{ room().minimum_stay }} night{{ room().minimum_stay === 1 ? '' : 's' }} minimum
        </li>
      </ul>
    </div>
    <aside class="choose">
      <div>
        <strong>{{ money(room().base_price, room().currency) }} / night</strong>
        @if (availability()?.available) {
          <small>{{ price() }} total for selected dates</small>
        }
      </div>
      @if (availability(); as a) {
        <span [class.available]="a.available">{{ availabilityMessage(a) }}</span>
        <div class="quantity">
          <button
            type="button"
            aria-label="Fewer rooms"
            [disabled]="quantity() <= 1"
            (click)="quantityChanged.emit(quantity() - 1)"
          >
            −</button
          ><span>{{ quantity() }} room(s)</span
          ><button
            type="button"
            aria-label="More rooms"
            [disabled]="quantity() >= a.rooms_available"
            (click)="quantityChanged.emit(quantity() + 1)"
          >
            +
          </button>
        </div>
      } @else {
        <span>Choose dates to check availability</span>
      }
      <button
        class="select-room"
        type="button"
        [disabled]="availability() && !availability()!.available"
        [attr.aria-pressed]="selected()"
        (click)="selectedRoom.emit(room().id)"
      >
        {{ selected() ? 'Selected' : 'Select room' }}
      </button>
    </aside>
  </article>`,
  styles: [
    `
      article {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr) minmax(170px, 0.32fr);
        gap: 1rem;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: 1rem;
        background: #fff;
        box-shadow: 0 14px 32px rgba(21, 43, 42, 0.05);
        transition:
          border-color 160ms ease,
          transform 160ms ease,
          box-shadow 160ms ease;
      }
      article:hover {
        transform: translateY(-1px);
        border-color: rgba(15, 157, 131, 0.35);
        box-shadow: 0 18px 40px rgba(21, 43, 42, 0.09);
      }
      article.selected {
        border-color: var(--teal);
        box-shadow: 0 0 0 3px rgba(15, 157, 131, 0.18);
      }
      .photo {
        min-height: 100%;
        background: #dce8e5;
      }
      .photo sp-image {
        display: block;
        height: 100%;
      }
      .body {
        display: grid;
        align-content: center;
        gap: 0.8rem;
        padding-block: 1rem;
      }
      h3,
      p {
        margin: 0;
      }
      h3 {
        color: var(--midnight);
        font-size: 1.25rem;
      }
      p,
      li,
      small,
      span {
        color: var(--slate);
      }
      ul {
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem 1rem;
        padding: 0;
        margin: 0;
        list-style: none;
      }
      li {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.9rem;
      }
      li i {
        color: var(--teal);
      }
      .choose {
        display: grid;
        align-content: center;
        justify-items: end;
        gap: 0.55rem;
        padding: 1rem 1rem 1rem 0;
        text-align: right;
      }
      .choose > div {
        display: grid;
      }
      .choose strong {
        color: var(--midnight);
        font-size: 1.28rem;
      }
      .choose button {
        min-width: 110px;
        border: 0;
        border-radius: 999px;
        background: var(--teal);
        color: #fff;
        padding: 0.78rem 1rem;
        font-weight: 900;
      }
      .choose button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .quantity {
        display: flex !important;
        align-items: center;
        gap: 8px;
      }
      .quantity button {
        min-width: 44px;
        min-height: 44px;
        padding: 8px;
      }
      .available {
        color: var(--teal);
        font-weight: 800;
      }
      @media (max-width: 767px) {
        :host {
          display: block;
          height: auto;
          min-height: 0;
        }
        article {
          display: flex;
          flex-direction: column;
          height: auto;
          min-height: 0;
          gap: 0;
          border-radius: 1rem;
        }
        .photo {
          flex: none;
          width: 100%;
          height: auto;
          min-height: auto;
          aspect-ratio: 16 / 9;
          overflow: hidden;
        }
        .photo sp-image,
        :host ::ng-deep .photo sp-image > div {
          width: 100%;
          height: 100%;
          min-height: 0;
          aspect-ratio: auto !important;
        }
        .body {
          flex: none;
          gap: 0.55rem;
          padding: 0.8rem 0.9rem 0;
          align-content: start;
        }
        h3 {
          font-size: 1.08rem;
        }
        .body p {
          display: none;
        }
        ul {
          gap: 0.35rem 0.8rem;
        }
        li {
          font-size: 0.82rem;
        }
        li:nth-child(n + 3) {
          display: none;
        }
        .choose {
          flex: none;
          grid-template-columns: 1fr auto;
          align-items: end;
          gap: 0.45rem;
          padding: 0.7rem 0.9rem 0.85rem;
          text-align: left;
        }
        .choose strong {
          font-size: 1rem;
          color: var(--teal);
        }
        .choose > span,
        .quantity {
          grid-column: 1 / -1;
          display: flex;
        }
        .choose button {
          min-width: 84px;
          padding: 0.55rem 0.7rem;
          border: 1px solid var(--teal);
          background: #fff;
          color: var(--teal);
        }
        article.selected .choose button {
          background: var(--teal);
          color: #fff;
        }
      }
      @media (max-width: 340px) {
        .choose {
          grid-template-columns: 1fr;
          align-items: start;
        }
        .choose button {
          width: 100%;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        article {
          transition: none;
        }
        article:hover {
          transform: none;
        }
      }
    `,
  ],
})
export class RoomCardComponent {
  room = input.required<RoomTypeSummary>();
  priority = input(false);
  availability = input<RoomAvailabilityResult | null>(null);
  selected = input(false);
  selectedRoom = output<string>();
  quantity = input(1);
  quantityChanged = output<number>();
  readonly money = formatMoney;
  coverImage() {
    const images = this.room().images || [];
    return images.find((image) => image.is_cover)?.image || images[0]?.image || null;
  }
  optionLabel(value: string) {
    return value === value.toUpperCase() ? value.replaceAll('_', ' ').toLowerCase() : value;
  }
  availabilityMessage(a: RoomAvailabilityResult) {
    if (a.available)
      return a.rooms_available === 1
        ? 'Only 1 room left for your dates'
        : `${a.rooms_available} rooms left for your dates`;
    return a.reason === 'occupancy'
      ? 'Does not fit selected guests'
      : a.reason === 'minimum_stay'
        ? `Minimum stay is ${a.minimum_stay} nights`
        : 'Sold out for these dates';
  }

  price() {
    const availability = this.availability();
    return availability
      ? formatMoney(availability.total, this.room().currency)
      : `From ${formatMoney(this.room().base_price, this.room().currency)}`;
  }
}
