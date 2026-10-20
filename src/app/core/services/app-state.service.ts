import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly online = signal(true);
  readonly active = signal(true);
}
