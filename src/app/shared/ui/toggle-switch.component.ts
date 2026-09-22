import { Component, input, output } from '@angular/core';

@Component({
  selector: 'sp-toggle-switch',
  standalone: true,
  template: `
    <label class="switch" [class.disabled]="disabled()">
      <span class="sr-only">{{ label() }}</span>
      <input
        type="checkbox"
        [checked]="checked()"
        [disabled]="disabled()"
        [attr.aria-label]="label()"
        (change)="checkedChange.emit($any($event.target).checked)"
      />
      <span class="track" aria-hidden="true"><span></span></span>
    </label>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .switch {
        position: relative;
        display: grid;
        width: 48px;
        height: 44px;
        place-items: center;
        cursor: pointer;
      }
      input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      .track {
        position: relative;
        width: 44px;
        height: 26px;
        border-radius: 999px;
        background: #9aabb0;
        box-shadow: inset 0 0 0 1px rgba(5, 36, 43, 0.06);
        transition: background 180ms ease;
      }
      .track span {
        position: absolute;
        top: 3px;
        left: 3px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 3px rgba(4, 39, 46, 0.2);
        transition: transform 180ms ease;
      }
      input:checked + .track {
        background: var(--teal);
      }
      input:checked + .track span {
        transform: translateX(18px);
      }
      input:focus-visible + .track {
        outline: 3px solid rgba(0, 154, 137, 0.3);
        outline-offset: 3px;
      }
      .disabled {
        cursor: default;
      }
      .disabled .track {
        opacity: 0.58;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
      @media (prefers-reduced-motion: reduce) {
        .track,
        .track span {
          transition: none;
        }
      }
    `,
  ],
})
export class ToggleSwitchComponent {
  checked = input(false);
  disabled = input(false);
  label = input.required<string>();
  checkedChange = output<boolean>();
}
