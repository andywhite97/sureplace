import { PaginatedResponse } from './api.models';
export type MessageType =
  'TEXT' | 'ENQUIRY' | 'BOOKING_ENQUIRY' | 'SYSTEM' | 'VIEWING_REQUEST' | 'VIEWING_UPDATE';
export interface ConversationParticipant {
  id: string;
  display_name: string;
  avatar: string | null;
  participant_type: string;
  is_me: boolean;
}
export interface Message {
  id: string;
  sender: string | null;
  message_type: MessageType;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  is_mine: boolean;
  pending?: boolean;
  failed?: boolean;
}
export interface BookingContext {
  id: string;
  reference: string;
  room_name: string;
  check_in: string;
  check_out: string;
  status: string;
  total: string;
  currency: string;
}
export interface ViewingContext {
  id: string;
  requested_date: string;
  requested_time: string;
  status: string;
}
export interface ConversationContext {
  type: 'PROPERTY' | 'STAY';
  id: string;
  slug: string;
  title: string;
  town: string;
  suburb: string;
  image: string | null;
  price?: string;
  currency?: string;
  status?: string;
  stay_type?: string;
  verification_status?: string;
  booking?: BookingContext;
  viewing?: ViewingContext;
}
export interface ConversationSummary {
  id: string;
  property: string | null;
  stay: string | null;
  subject: string;
  status: string;
  last_message_at: string | null;
  last_message: Message | null;
  unread_count: number;
  participants: ConversationParticipant[];
  context: ConversationContext | null;
  created_at: string;
}
export type ConversationDetail = ConversationSummary;
export interface MessageCreateRequest {
  body: string;
  message_type: 'TEXT';
}
export type MessagePage = PaginatedResponse<Message>;
