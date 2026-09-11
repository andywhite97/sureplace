import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ListingTypeChoiceComponent } from './listing-type-choice.component';

describe('ListingTypeChoiceComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListingTypeChoiceComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('starts with property selected and points continue to the property wizard', () => {
    const fixture = TestBed.createComponent(ListingTypeChoiceComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe('property');
    expect(fixture.componentInstance.target()).toBe('/account/manage/properties/new');
    expect(fixture.nativeElement.textContent).toContain('Property');
    expect(fixture.nativeElement.textContent).toContain('Stay');
  });

  it('switches continue to the stay wizard when stay is selected', () => {
    const fixture = TestBed.createComponent(ListingTypeChoiceComponent);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.kind-grid button');
    buttons[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe('stay');
    expect(fixture.componentInstance.target()).toBe('/account/manage/stays/new');
  });
});
