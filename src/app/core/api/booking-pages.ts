import { EMPTY, Observable, defer, expand, reduce } from 'rxjs';
import { PaginatedResponse } from '../models/api.models';

// Booking tabs and counts operate on the complete history, including later pages.
export function bookingPages<T>(fetch: (page?: string) => Observable<PaginatedResponse<T>>) {
  return defer(() => {
    let page = 1;
    return fetch().pipe(
      expand((response) => (response.next ? fetch(String(++page)) : EMPTY), 1),
      reduce(
        (all, response) => ({
          count: response.count,
          next: null,
          previous: null,
          results: [...all.results, ...response.results],
        }),
        { count: 0, next: null, previous: null, results: [] } as PaginatedResponse<T>,
      ),
    );
  });
}
