import { Component, computed, input, signal } from '@angular/core';

@Component({
  selector: 'sp-profile-image',
  standalone: true,
  template: `@if (src() && src() !== failedSource()) {
    <img [src]="src()" [alt]="name()" [class.logo]="agency()" loading="lazy" (error)="failedSource.set(src())" />
  } @else if (agency()) {
    <i class="fa-solid fa-building" aria-hidden="true"></i>
  } @else {
    <span aria-hidden="true">{{ initials() }}</span>
  }`,
  styles: [`:host{display:inline-grid;place-items:center;flex:none;width:var(--profile-image-size,2rem);height:var(--profile-image-size,2rem);overflow:hidden;border-radius:50%;background:#e6f7f1;color:var(--teal);font-weight:800;font-size:.8rem}img{width:100%;height:100%;object-fit:cover}img.logo{object-fit:contain;background:#fff}`],
})
export class ProfileImageComponent {
  src = input<string | null | undefined>(null);
  name = input('');
  agency = input(false);
  failedSource = signal<string | null | undefined>(null);
  initials = computed(() => this.name().trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?');
}
