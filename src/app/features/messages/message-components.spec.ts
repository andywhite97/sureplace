import { TestBed } from '@angular/core/testing';
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
describe('messaging components', () => {
  it('distinguishes system messages and removed content', () => {
    const f = TestBed.configureTestingModule({ imports: [MessageBubbleComponent] }).createComponent(
      MessageBubbleComponent,
    );
    f.componentRef.setInput('message', {
      id: '1',
      sender: null,
      message_type: 'VIEWING_UPDATE',
      body: 'Viewing confirmed',
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      is_mine: false,
    });
    f.detectChanges();
    expect(f.nativeElement.querySelector('.system-card')).not.toBeNull();
    expect(f.nativeElement.textContent).toContain('Viewing update');
    f.componentRef.setInput('message', {
      ...f.componentInstance.message(),
      sender: 'u1',
      message_type: 'TEXT',
      deleted_at: new Date().toISOString(),
    });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('This message was removed.');
  });
  it('trims messages, blocks whitespace and supports Enter to send', () => {
    const f = TestBed.configureTestingModule({
      imports: [MessageComposerComponent],
    }).createComponent(MessageComposerComponent);
    const sent = vi.fn();
    f.componentInstance.sent.subscribe(sent);
    f.componentInstance.body.set('   ');
    f.componentInstance.submit();
    expect(sent).not.toHaveBeenCalled();
    f.componentInstance.body.set('  Hello\nthere  ');
    f.componentInstance.keydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(sent).toHaveBeenCalledWith('Hello\nthere');
  });
});
