import { Component, input } from '@angular/core';
@Component({selector:'sp-empty-state',standalone:true,template:`<section><h2>{{title()}}</h2><p>{{message()}}</p><ng-content /></section>`,styles:[`section{text-align:center;padding:3rem 1rem;border:1px dashed var(--line);border-radius:var(--radius-md);background:var(--surface)}h2{margin:0 0 .5rem;color:var(--midnight)}p{color:var(--slate);margin:0 0 1rem}`]})
export class EmptyStateComponent{title=input('Nothing here yet');message=input('Content will appear here when it becomes available.')}
