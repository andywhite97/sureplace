import { Component, input, output } from '@angular/core';
import { RoomAvailabilityResult, RoomTypeSummary } from '../../../core/models/listing.models';
import { SmartImageComponent } from '../../../shared/ui/smart-image.component';
import { formatMoney } from '../../../shared/listing/price-format';
@Component({
  selector: 'sp-room-card',
  standalone: true,
  imports: [SmartImageComponent],
  template: `<article [class.selected]="selected()">
    <sp-image [src]="room().images[0]?.image || null" [alt]="room().name" ratio="16 / 9" />
    <div class="body">
      <div>
        <h3>{{ room().name }}</h3>
        <p>{{ room().description }}</p>
      </div>
      <ul>
        <li>
          Up to {{ room().capacity_adults }} adult{{ room().capacity_adults === 1 ? '' : 's' }}
          @if (room().capacity_children) {
            + {{ room().capacity_children }} children
          }
        </li>
        <li>
          {{ room().number_of_beds }} bed{{ room().number_of_beds === 1 ? '' : 's'
          }}{{ room().bed_configuration ? ' · ' + room().bed_configuration : '' }}
        </li>
        @if (room().bathroom_type) {
          <li>{{ room().bathroom_type }}</li>
        }
        <li>Minimum {{ room().minimum_stay }} night{{ room().minimum_stay === 1 ? '' : 's' }}</li>
      </ul>
      <div class="choose">
        <div>
          <strong>{{ price() }}</strong
          ><small>{{ availability() ? ' total for selected dates' : ' / night' }}</small>
          @if (availability(); as a) {
            <span [class.available]="a.available">{{
              a.available
                ? a.rooms_available + ' room' + (a.rooms_available === 1 ? '' : 's') + ' available'
                : 'Unavailable for these dates'
            }}</span>
          } @else {
            <span>Choose dates to check availability</span>
          }
        </div>
        <button
          type="button"
          [disabled]="availability() && !availability()!.available"
          (click)="selectedRoom.emit(room().id)"
        >
          {{ selected() ? 'Selected' : 'Select room' }}
        </button>
      </div>
    </div>
  </article>`,
  styles: [
    `
      article {
        display: grid;
        grid-template-columns: 220px 1fr;
        background: #fff;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        overflow: hidden;
      }
      article.selected {
        outline: 3px solid var(--teal);
      }
      .body {
        padding: 1rem;
        display: grid;
        gap: 0.6rem;
      }
      h3,
      p {
        margin: 0.15rem 0;
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
        gap: 0.5rem 1.2rem;
        padding-left: 1.1rem;
        margin: 0.3rem 0;
      }
      .choose {
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 1rem;
      }
      .choose > div {
        display: grid;
      }
      .choose button {
        border: 0;
        border-radius: 0.5rem;
        background: var(--teal);
        color: #fff;
        padding: 0.7rem 1rem;
        font-weight: 800;
      }
      .choose button:disabled {
        opacity: 0.45;
      }
      .available {
        color: var(--teal);
        font-weight: 700;
      }
      @media (max-width: 650px) {
        article {
          grid-template-columns: 1fr;
        }
        .choose {
          align-items: center;
        }
      }
    `,
  ],
})
export class RoomCardComponent {
  room = input.required<RoomTypeSummary>();
  availability = input<RoomAvailabilityResult | null>(null);
  selected = input(false);
  selectedRoom = output<string>();
  price() {
    const a = this.availability();
    return a
      ? formatMoney(a.total, this.room().currency)
      : `From ${formatMoney(this.room().base_price, this.room().currency)}`;
  }
}
