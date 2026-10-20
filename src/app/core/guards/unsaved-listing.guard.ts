import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface EditableListing {
  dirty: () => boolean;
  saveState: () => string;
  pendingImages?: () => unknown[];
  roomBusy?: () => boolean;
  submitted?: () => boolean;
}

export const unsavedListingGuard: CanDeactivateFn<EditableListing> = (component) => {
  if (component.submitted?.() && !component.dirty()) return true;
  const state = component.saveState();
  const pending = component.dirty() || state === 'saving' || state === 'unsaved' || state === 'error' ||
    !!component.pendingImages?.().length || !!component.roomBusy?.();
  if (!pending) return true;
  return inject(DOCUMENT).defaultView?.confirm(
    'Leave this listing? Unsaved changes or unfinished uploads may be lost. Stay here to save your draft first.',
  ) ?? false;
};
