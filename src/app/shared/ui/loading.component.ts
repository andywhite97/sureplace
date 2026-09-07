import { Component, input } from '@angular/core';
@Component({selector:'sp-loading',standalone:true,template:`<div role="status" aria-live="polite"><span aria-hidden="true"></span>{{label()}}</div>`,styles:[`div{display:flex;align-items:center;justify-content:center;gap:.65rem;padding:2rem;color:var(--slate)}span{width:1.25rem;height:1.25rem;border:2px solid var(--line);border-top-color:var(--teal);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`]})
export class LoadingComponent{label=input('Loading…')}
