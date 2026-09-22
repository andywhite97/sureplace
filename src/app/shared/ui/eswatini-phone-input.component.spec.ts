import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EswatiniPhoneInputComponent } from './eswatini-phone-input.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, EswatiniPhoneInputComponent],
  template: `<sp-eswatini-phone-input [formControl]="phone" />`,
})
class HostComponent {
  phone = new FormControl('+26876123456', { nonNullable: true });
}

describe('EswatiniPhoneInputComponent', () => {
  it('shows the fixed country code while keeping the international form value', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(
      HostComponent,
    );
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(fixture.nativeElement.querySelector('.country-code').textContent).toContain('+268');
    expect(input.value).toBe('76123456');
    expect(fixture.componentInstance.phone.value).toBe('+26876123456');
  });

  it('normalizes local, pasted international, and cleared values', () => {
    const fixture = TestBed.configureTestingModule({ imports: [HostComponent] }).createComponent(
      HostComponent,
    );
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    input.value = '076 555 444';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.phone.value).toBe('+26876555444');

    input.value = '+268 79 000 111';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.phone.value).toBe('+26879000111');

    input.value = '';
    input.dispatchEvent(new Event('input'));
    expect(fixture.componentInstance.phone.value).toBe('');
  });
});
