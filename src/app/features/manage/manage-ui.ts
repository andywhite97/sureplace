import { Component, input } from '@angular/core';

@Component({
  selector: 'sp-manage-status',
  standalone: true,
  template: `<span [class]="tone()">{{ label() }}</span>`,
  styles: [
    `span{display:inline-flex;width:max-content;border-radius:999px;padding:.22rem .55rem;font-size:.74rem;font-weight:850;background:var(--mist);color:var(--slate)}.good{background:#e6f7ef;color:#17633b}.warn{background:#fff4dd;color:#8a5a00}.bad{background:#fde8e8;color:#9b2525}`,
  ],
})
export class ManageStatusComponent {
  status = input.required<string>();
  label() {
    return this.status().toLowerCase().split('_').map((x) => x[0].toUpperCase() + x.slice(1)).join(' ');
  }
  tone() {
    if (['PUBLISHED', 'CONFIRMED', 'APPROVED', 'COMPLETED', 'AVAILABLE'].includes(this.status())) return 'good';
    if (['REJECTED', 'SUSPENDED', 'DECLINED', 'CANCELLED', 'EXPIRED', 'UNAVAILABLE'].includes(this.status())) return 'bad';
    return 'warn';
  }
}

@Component({
  selector: 'sp-quality-score',
  standalone: true,
  template: `<section>
    <strong>Listing quality: {{ score() }}%</strong>
    <meter min="0" max="100" [value]="score()"></meter>
    @if (suggestions().length) {
      <ul>@for (item of suggestions(); track item) { <li>{{ item }}</li> }</ul>
    }
  </section>`,
  styles: [
    `section{display:grid;gap:.35rem}meter{width:100%;height:.6rem}ul{margin:.2rem 0 0;padding-left:1.1rem;color:var(--slate);font-size:.86rem}`,
  ],
})
export class QualityScoreComponent {
  score = input(0);
  suggestions = input<string[]>([]);
}
