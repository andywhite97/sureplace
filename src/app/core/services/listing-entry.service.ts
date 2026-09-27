import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ListingEntryService {
  readonly propertyRoute = '/account/manage/properties/new';
  readonly stayRoute = '/account/manage/stays/new';

  private router = inject(Router);

  startPropertyListing() {
    return this.router.navigate([this.propertyRoute]);
  }

  startStayListing() {
    return this.router.navigate([this.stayRoute]);
  }
}