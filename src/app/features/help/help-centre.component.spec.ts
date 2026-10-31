import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileIntroService } from '../../core/services/mobile-intro.service';
import { HelpCentreComponent } from './help-centre.component';

describe('Help Centre refinement', () => {
  const intro = { native: true, replay: vi.fn() };
  beforeEach(() => {
    intro.replay.mockReset();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MobileIntroService, useValue: intro }],
    });
  });
  it('keeps guide counts separate from the search input', () => {
    const f = TestBed.createComponent(HelpCentreComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('form.help-search').textContent.trim()).toBe('');
    expect(f.nativeElement.querySelector('.help-search-status').textContent).toContain(
      String(f.componentInstance.filteredArticles().length),
    );
  });
  it('popular shortcuts clear category restrictions and return real guides', () => {
    const f = TestBed.createComponent(HelpCentreComponent);
    f.componentInstance.selectCategory('Account & safety');
    for (const shortcut of f.componentInstance.shortcuts) {
      f.componentInstance.search(shortcut.term);
      expect(f.componentInstance.selectedCategory()).toBeNull();
      expect(f.componentInstance.filteredArticles().length).toBeGreaterThan(0);
    }
  });
  it('shows a useful empty state and restores all guides', () => {
    const f = TestBed.createComponent(HelpCentreComponent);
    f.componentInstance.query.set('no-such-guide-xyz');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No matching guides');
    f.nativeElement.querySelector('.empty button').click();
    f.detectChanges();
    expect(f.componentInstance.filteredArticles().length).toBeGreaterThan(0);
  });
  it('reopens the existing guided tour', () => {
    const f = TestBed.createComponent(HelpCentreComponent);
    f.detectChanges();
    f.nativeElement.querySelector('.tour-invite button').click();
    expect(intro.replay).toHaveBeenCalledOnce();
  });
});
