import { Component, input } from '@angular/core';
import { BookingPolicy } from '../../core/models/account.models';
@Component({
  selector: 'sp-booking-policies',
  standalone: true,
  template: `<section class="policy">
    <h3>Booking policy</h3>
    <p>✓ No online payment required · Pay at property</p>
    <p>
      <strong>Cancellation</strong><br />{{
        policy().cancellation_policy ||
          'Cancellation terms have not been supplied. Contact the property before booking.'
      }}
    </p>
    <p>
      Check-in: {{ policy().check_in_time?.slice(0, 5) || 'Arrange with the property' }} ·
      Check-out: {{ policy().check_out_time?.slice(0, 5) || 'Arrange with the property' }}
    </p>
    @if (policy().minimum_stay) {
      <p>Minimum stay: {{ policy().minimum_stay }} night(s)</p>
    }
    @if (policy().house_rules) {
      <p><strong>House rules</strong><br />{{ policy().house_rules }}</p>
    }
  </section>`,
  styles: [
    `
      .policy {
        font-size: 14px;
        color: var(--slate);
        line-height: 1.6;
      }
      h3,
      strong {
        color: var(--midnight);
      }
      p {
        white-space: pre-line;
      }
    `,
  ],
})
export class BookingPoliciesComponent {
  policy = input<BookingPolicy>({});
}
