import { Component, inject } from '@angular/core';
import { Toast, ToastService } from '../core/services/toast.service';

@Component({
  selector: 'sp-toast-region',
  standalone: true,
  template: `<aside aria-live="polite" aria-label="Notifications">
    @for(toast of service.items(); track toast.id){
      <article class="toast" [class.success]="toast.kind === 'success'" [class.error]="toast.kind === 'error'" [class.warning]="toast.kind === 'warning'" [class.info]="toast.kind === 'info'" [class.loading]="toast.kind === 'loading'" [class.action]="toast.kind === 'action'" [attr.role]="toast.kind === 'error' ? 'alert' : 'status'">
        <i [class]="icon(toast)" aria-hidden="true"></i>
        <div><strong>{{toast.title}}</strong>@if(toast.message){<p>{{toast.message}}</p>}@if(toast.action){<button class="toast-action" type="button" (click)="toast.action.run(); service.dismiss(toast.id)">{{toast.action.label}}</button>}</div>
        <button class="dismiss" type="button" aria-label="Dismiss notification" (click)="service.dismiss(toast.id)"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </article>
    }
  </aside>`,
  styles: [
    `aside{position:fixed;z-index:120;right:1.25rem;bottom:1.25rem;display:flex;flex-direction:column-reverse;gap:.7rem;width:min(360px,calc(100vw - 2rem));pointer-events:none}.toast{display:grid;grid-template-columns:28px 1fr 34px;gap:.7rem;align-items:start;padding:.85rem;border:1px solid var(--line);border-left-width:4px;border-radius:.85rem;background:#fff;box-shadow:0 16px 38px rgba(21,43,42,.14);pointer-events:auto;animation:toast-in 160ms ease-out}.toast>i{margin-top:.1rem;font-size:1.1rem;color:var(--slate)}strong{display:block;color:var(--midnight);font-weight:850}p{margin:.18rem 0 0;color:var(--slate);font-size:.92rem;line-height:1.4}.dismiss{width:34px;height:34px;border:0;border-radius:.55rem;background:transparent;color:var(--slate);cursor:pointer}.dismiss:hover,.toast-action:hover{background:var(--mist)}.toast-action{margin-top:.55rem;min-height:34px;border:1px solid var(--line);border-radius:.55rem;background:#fff;color:var(--teal);font-weight:850;padding:.35rem .6rem}.success,.action{border-left-color:var(--teal)}.success>i,.action>i{color:var(--teal)}.error{border-left-color:var(--danger)}.error>i{color:var(--danger)}.warning{border-left-color:var(--amber)}.warning>i{color:var(--amber)}.info,.loading{border-left-color:var(--verification)}.info>i,.loading>i{color:var(--verification)}.loading>i{animation:spin 900ms linear infinite}@keyframes toast-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(1turn)}}@media(max-width:700px){aside{left:.85rem;right:.85rem;bottom:calc(78px + env(safe-area-inset-bottom));width:auto}.toast{grid-template-columns:26px 1fr 34px;padding:.8rem}}`,
  ],
})
export class ToastRegionComponent {
  service = inject(ToastService);

  icon(toast: Toast) {
    return toast.kind === 'success' || toast.kind === 'action' ? 'fa-solid fa-circle-check' : toast.kind === 'error' ? 'fa-solid fa-circle-exclamation' : toast.kind === 'warning' ? 'fa-solid fa-triangle-exclamation' : toast.kind === 'loading' ? 'fa-solid fa-spinner' : 'fa-solid fa-circle-info';
  }
}
