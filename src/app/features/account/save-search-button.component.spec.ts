import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SaveSearchButtonComponent } from './save-search-button.component';

describe('SaveSearchButtonComponent', () => {
  it('redirects anonymous users to login with return url', () => {
    const f = TestBed.configureTestingModule({
      imports: [SaveSearchButtonComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).createComponent(SaveSearchButtonComponent);
    f.componentRef.setInput('searchType', 'PROPERTY');
    f.componentRef.setInput('criteria', { town: 'Ezulwini' });
    f.componentRef.setInput('defaultName', 'Properties in Ezulwini');
    const auth = TestBed.inject(AuthService);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate');
    auth.user.set(null);
    f.componentInstance.open();
    expect(f.componentInstance.modal()).toBe(false);
    expect(nav).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
    nav.mockRestore();
  });

  it('creates a saved search for authenticated users', () => {
    const f = TestBed.configureTestingModule({
      imports: [SaveSearchButtonComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).createComponent(SaveSearchButtonComponent);
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).user.set({ id:'u1', email:'a@example.com', phone_number:'', first_name:'A', last_name:'', avatar:null, is_email_verified:true, is_phone_verified:false, onboarding_intents:[] });
    f.componentRef.setInput('searchType', 'STAY');
    f.componentRef.setInput('criteria', { town: 'Mbabane' });
    f.componentRef.setInput('defaultName', 'Stays in Mbabane');
    f.componentInstance.open();
    f.componentInstance.save();
    const req = http.expectOne('/api/v1/saved-searches/');
    expect(req.request.body).toMatchObject({ search_type: 'STAY', criteria: { town: 'Mbabane' } });
    req.flush({});
    http.verify();
  });
});
