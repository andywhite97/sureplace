import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'action';
export interface ToastAction {
  label: string;
  run: () => void;
}
export interface Toast {
  id: number;
  title: string;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
  persistent?: boolean;
}
export interface ToastOptions {
  title?: string;
  message?: string;
  kind?: ToastKind;
  duration?: number;
  action?: ToastAction;
  persistent?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<Toast[]>([]);
  private nextId = 1;

  show(message: string, kind?: ToastKind): number;
  show(options: ToastOptions): number;
  show(value: string | ToastOptions, kind: ToastKind = 'info') {
    const options = typeof value === 'string' ? { message: value, kind } : value;
    const toastKind = options.kind ?? kind;
    const id = this.nextId++;
    const toast: Toast = {
      id,
      title: options.title || this.defaultTitle(toastKind),
      message: options.message || '',
      kind: toastKind,
      action: options.action,
      persistent: options.persistent || toastKind === 'loading',
    };
    this.items.update((items) => [...items, toast]);
    const duration = options.duration ?? this.defaultDuration(toastKind);
    if (!toast.persistent && duration > 0) window.setTimeout(() => this.dismiss(id), duration);
    return id;
  }

  dismiss(id: number) {
    this.items.update((items) => items.filter((item) => item.id !== id));
  }

  private defaultTitle(kind: ToastKind) {
    return kind === 'success' ? 'Success!' : kind === 'error' ? 'Something went wrong' : kind === 'warning' ? 'Please check' : kind === 'loading' ? 'Working...' : 'Update';
  }

  private defaultDuration(kind: ToastKind) {
    return kind === 'error' || kind === 'warning' || kind === 'action' ? 7000 : kind === 'loading' ? 0 : 4500;
  }
}
