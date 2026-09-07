import { inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiClient } from './api-client';
import { ReferenceData } from '../models/api.models';
const empty: ReferenceData = {
  property_types: [],
  property_amenities: [],
  stay_amenities: [],
  listing_types: [],
  stay_types: [],
  regions: [],
  countries: [],
  currencies: [],
  verification_types: [],
};
@Injectable({ providedIn: 'root' })
export class ReferenceApiService {
  private api = inject(ApiClient);
  readonly data = signal(empty);
  load() {
    return this.api.get<ReferenceData>('/reference/').pipe(
      tap((value) => this.data.set(value)),
      catchError(() => of(empty)),
    );
  }
}
