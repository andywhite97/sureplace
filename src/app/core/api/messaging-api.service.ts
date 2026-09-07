import { inject, Injectable } from '@angular/core';
import { ApiClient } from './api-client';
import { PaginatedResponse } from '../models/api.models';
import {
  ConversationDetail,
  ConversationSummary,
  Message,
  MessageCreateRequest,
  MessagePage,
} from '../models/messaging.models';
@Injectable({ providedIn: 'root' })
export class MessagingApiService {
  private api = inject(ApiClient);
  list() {
    return this.api.get<PaginatedResponse<ConversationSummary>>('/conversations/');
  }
  detail(id: string) {
    return this.api.get<ConversationDetail>(`/conversations/${encodeURIComponent(id)}/`);
  }
  messages(id: string, page = 1) {
    return this.api.get<MessagePage>(`/conversations/${encodeURIComponent(id)}/messages/`, {
      page: String(page),
    });
  }
  send(id: string, body: MessageCreateRequest) {
    return this.api.post<Message>(`/conversations/${encodeURIComponent(id)}/messages/`, body);
  }
  markRead(id: string) {
    return this.api.post<{ unread_count: number }>(
      `/conversations/${encodeURIComponent(id)}/mark-read/`,
      {},
    );
  }
  createForProperty(property: string, message: string) {
    return this.api.post<ConversationSummary>('/conversations/', {
      property,
      message,
      subject: 'Property enquiry',
    });
  }
  createForStay(stay: string, message: string) {
    return this.api.post<ConversationSummary>('/conversations/', {
      stay,
      message,
      subject: 'Stay enquiry',
    });
  }
}
