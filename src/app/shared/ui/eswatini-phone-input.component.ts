import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

const COUNTRY_CODE = '+268';

@Component({
  selector: 'sp-eswatini-phone-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EswatiniPhoneInputComponent),
      multi: true,
    },
  ],
  template: `<div class="phone-control" [class.invalid]="invalid()">
    <span class="country-code" aria-hidden="true">+268</span>
    <input
      type="tel"
      inputmode="numeric"
      maxlength="8"
      [value]="localValue()"
      [disabled]="disabled()"
      [placeholder]="placeholder()"
      [autocomplete]="autocomplete()"
      [attr.aria-describedby]="describedBy() || null"
      aria-label="Eswatini phone number"
      (input)="changed($any($event.target).value)"
      (blur)="touched()"
    />
  </div>`,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .phone-control {
        display: flex;
        width: 100%;
        min-height: 48px;
        box-sizing: border-box;
        align-items: stretch;
        overflow: hidden;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm, 10px);
        background: #fff;
      }
      .phone-control:focus-within {
        border-color: var(--teal);
        outline: 3px solid color-mix(in srgb, var(--teal) 18%, transparent);
      }
      .country-code {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        padding: 0 0.8rem;
        border-right: 1px solid var(--line);
        background: #f4f8f7;
        color: var(--midnight);
        font-weight: 750;
      }
      input {
        width: 100%;
        min-width: 0;
        min-height: 46px;
        box-sizing: border-box;
        padding: 0.7rem 0.8rem;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--midnight);
        font: inherit;
        font-size: 16px;
      }
      .invalid,
      :host.ng-invalid.ng-touched .phone-control {
        border-color: var(--danger, #b52d2d);
      }
      input:disabled {
        cursor: not-allowed;
        opacity: 0.65;
      }
    `,
  ],
})
export class EswatiniPhoneInputComponent implements ControlValueAccessor {
  placeholder = input('76 123 456');
  autocomplete = input('tel');
  describedBy = input('');
  invalid = input(false);
  localValue = signal('');
  disabled = signal(false);
  private change: (value: string) => void = () => undefined;
  touched: () => void = () => undefined;

  writeValue(value: string | null | undefined) {
    this.localValue.set(this.toLocal(value || ''));
  }

  registerOnChange(change: (value: string) => void) {
    this.change = change;
  }

  registerOnTouched(touched: () => void) {
    this.touched = touched;
  }

  setDisabledState(disabled: boolean) {
    this.disabled.set(disabled);
  }

  changed(value: string) {
    const local = this.toLocal(value);
    this.localValue.set(local);
    this.change(local ? `${COUNTRY_CODE}${local}` : '');
  }

  private toLocal(value: string) {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('268')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits.slice(0, 8);
  }
}
