import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConversationSummary } from '../../core/models/messaging.models';
import { ConversationListComponent } from './conversation-list.component';
import { MessageBubbleComponent } from './message-bubble.component';
import { MessageComposerComponent } from './message-composer.component';
describe('messaging components', () => {
  const conversation = (
    id: string,
    type: 'PROPERTY' | 'STAY',
    unreadCount: number,
  ): ConversationSummary => ({
    id,
    property: type === 'PROPERTY' ? id : null,
    stay: type === 'STAY' ? id : null,
    subject: `${type} enquiry`,
    status: 'OPEN',
    last_message_at: '2026-09-21T10:00:00Z',
    last_message: {
      id: `message-${id}`,
      sender: 'other',
      message_type: 'TEXT',
      body: type === 'PROPERTY' ? 'Is the home available?' : 'Can I book this room?',
      created_at: '2026-09-21T10:00:00Z',
      edited_at: null,
      deleted_at: null,
      is_mine: false,
    },
    unread_count: unreadCount,
    participants: [
      { id: 'me', display_name: 'Me', avatar: null, participant_type: 'USER', is_me: true },
      {
        id: `other-${id}`,
        display_name: type === 'PROPERTY' ? 'Property Agent' : 'Stay Host',
        avatar: null,
        participant_type: 'USER',
        is_me: false,
      },
    ],
    context: {
      type,
      id,
      slug: id,
      title: type === 'PROPERTY' ? 'Mbabane Home' : 'Lobamba Stay',
      town: type === 'PROPERTY' ? 'Mbabane' : 'Lobamba',
      suburb: '',
      image: null,
    },
    created_at: '2026-09-21T09:00:00Z',
  });

  it('derives desktop conversation counts and applies the shared filters', () => {
    const fixture = TestBed.configureTestingModule({
      imports: [ConversationListComponent],
      providers: [provideRouter([])],
    }).createComponent(ConversationListComponent);
    fixture.componentRef.setInput('conversations', [
      conversation('property-1', 'PROPERTY', 2),
      conversation('stay-1', 'STAY', 0),
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.unreadConversationCount()).toBe(1);
    expect(fixture.componentInstance.propertyCount()).toBe(1);
    expect(fixture.componentInstance.stayCount()).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.desktop-filters').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.mobile-filters').length).toBe(1);

    fixture.componentInstance.filter.set('stay');
    expect(fixture.componentInstance.filtered().map((item) => item.id)).toEqual(['stay-1']);
    fixture.componentInstance.search.set('book this room');
    expect(fixture.componentInstance.filtered().map((item) => item.id)).toEqual(['stay-1']);
  });

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
