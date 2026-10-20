import { Component, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'sp-business-links-editor',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<fieldset [formGroup]="form()">
    <legend>Social &amp; Online Presence</legend>
    <p>Optional public business links. Use a full HTTPS address on the matching platform.</p>
    @for (field of fields; track field.key) {
      <label
        >{{ field.label
        }}<input
          type="url"
          [formControlName]="field.key"
          [placeholder]="field.hint"
          autocomplete="url"
        />
        @if (form().get(field.key)?.invalid && form().get(field.key)?.touched) {
          <small role="alert">Enter a valid public {{ field.label }} HTTPS URL.</small>
        }
      </label>
    }
    @if (includeContact()) {
      <label
        >Website<input type="url" formControlName="website" placeholder="https://your-business.com"
      /></label>
      <label
        >Public WhatsApp<input type="tel" formControlName="whatsapp_number" placeholder="+268…"
      /></label>
      @if (form().get('website')?.invalid || form().get('whatsapp_number')?.invalid) {
        <small role="alert"
          >Use a public HTTPS website and an international WhatsApp number beginning with +.</small
        >
      }
    }
  </fieldset>`,
  styles: [
    `
      fieldset {
        min-width: 0;
        border: 1px solid var(--line, #dde6e4);
        border-radius: 16px;
        padding: 1rem;
        margin: 1rem 0;
        display: grid;
        gap: 0.75rem;
      }
      legend {
        font-weight: 650;
      }
      p {
        font-size: 0.85rem;
        margin: 0;
      }
      label {
        display: grid;
        gap: 0.3rem;
      }
      input {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        padding: 0.65rem;
        border: 1px solid #b9ceca;
        border-radius: 8px;
      }
      small {
        color: #a52626;
      }
    `,
  ],
})
export class BusinessLinksEditorComponent {
  form = input.required<FormGroup>();
  includeContact = input(false);
  fields = [
    { key: 'facebook_url', label: 'Facebook', hint: 'https://www.facebook.com/your-business' },
    { key: 'instagram_url', label: 'Instagram', hint: 'https://www.instagram.com/your-business' },
    { key: 'tiktok_url', label: 'TikTok', hint: 'https://www.tiktok.com/@your-business' },
  ];
}
