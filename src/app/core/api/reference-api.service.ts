import { inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, of, shareReplay, tap } from 'rxjs';
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
  private loaded = false;
  private request$ = this.createRequest();
  readonly data = signal(empty);

  load() {
    return this.loaded ? of(this.data()) : this.request$;
  }

  refresh() {
    this.loaded = false;
    this.request$ = this.createRequest();
    return this.request$;
  }

  private createRequest() {
    return this.api.get<ReferenceData>('/reference/').pipe(
      tap((value) => {
        this.data.set(value);
        this.loaded = true;
      }),
      catchError(() => {
        this.loaded = true;
        return of(empty);
      }),
      finalize(() => {
        if (!this.loaded) this.request$ = this.createRequest();
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
  }
}
