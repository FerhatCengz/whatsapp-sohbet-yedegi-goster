import JSZip from 'jszip';

export interface Message {
  id: string;
  rawDate: string;
  timestamp: Date;
  sender: string;
  content: string;
  isMe: boolean;
  isSystem: boolean;
  type: 'text' | 'image' | 'audio' | 'video' | 'system';
  attachmentFileName?: string; // Only the filename, not the blob URL
}

export interface ChatParticipant {
  name: string;
  lastMessage: string;
  lastMessageDate: Date;
  avatarColor: string;
}

export interface ChatData {
  participants: ChatParticipant[];
  messages: Message[];
  allSenders: string[];
  zipFile: JSZip | null; // Keep reference to the zip to load images lazily
}