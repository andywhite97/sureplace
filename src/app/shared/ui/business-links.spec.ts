import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { businessUrl, businessPhone } from './business-links';
import { BusinessLinksComponent } from './business-links.component';
import { BusinessLinksEditorComponent } from './business-links-editor.component';

describe('Business links', () => {
  it('accepts optional links and matching official domains', () => {
    expect(businessUrl('facebook')(new FormControl(''))).toBeNull();
    expect(businessUrl('instagram')(new FormControl('https://www.instagram.com/lodge'))).toBeNull();
    expect(businessPhone(new FormControl('+26876123456'))).toBeNull();
  });
  it('rejects unsafe schemes, deceptive hosts, credentials and private destinations', () => {
    for (const url of [
      'javascript:alert(1)',
      'http://example.com',
      'https://localhost',
      'https://127.0.0.1',
      'https://192.168.1.1',
      'https://user@example.com',
      'https://business.local',
    ])
      expect(businessUrl()(new FormControl(url))).not.toBeNull();
    expect(
      businessUrl('facebook')(new FormControl('https://facebook.com.evil.com/lodge')),
    ).not.toBeNull();
    expect(
      businessUrl('facebook')(new FormControl('https://facebook.com/l.php?u=evil')),
    ).not.toBeNull();
    expect(businessPhone(new FormControl('76123456'))).not.toBeNull();
  });
  it('renders only safe populated links with secure attributes', () => {
    const f = TestBed.createComponent(BusinessLinksComponent);
    f.componentRef.setInput('business', {
      instagram_url: 'https://instagram.com/lodge',
      website: 'javascript:alert(1)',
      whatsapp_number: '+26876123456',
    });
    f.detectChanges();
    const links = Array.from(f.nativeElement.querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link.rel).toContain('noopener');
      expect(link.rel).toContain('noreferrer');
      expect(link.rel).toContain('ugc');
    }
    expect(links[1].href).toBe('https://wa.me/26876123456');
  });
  it('shows nothing when empty', () => {
    const f = TestBed.createComponent(BusinessLinksComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('section')).toBeNull();
  });
  it('rehydrates editor controls without dropping saved links', () => {
    const form = new FormGroup({
      facebook_url: new FormControl('https://facebook.com/lodge'),
      instagram_url: new FormControl(''),
      tiktok_url: new FormControl(''),
    });
    const f = TestBed.createComponent(BusinessLinksEditorComponent);
    f.componentRef.setInput('form', form);
    f.detectChanges();
    expect(f.nativeElement.querySelector('input').value).toBe('https://facebook.com/lodge');
    form.patchValue({ instagram_url: 'https://instagram.com/lodge' });
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('input')[1].value).toBe('https://instagram.com/lodge');
  });
});
