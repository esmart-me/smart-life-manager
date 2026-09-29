// src/lib/ai/types.ts
// Type definitions for Smart Life Manager AI Assistant

export type AiRole = "user" | "assistant" | "system";

export interface AiMessageDTO {
  id: string;
  conversationId: string;
  role: AiRole;
  content: string;
  tokenCount?: number | null;
  createdAt: string | Date;
}

export interface AiConversationSummaryDTO {
  id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  messageCount: number;
}

export interface AiConversationDetailDTO {
  id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  messages: AiMessageDTO[];
}

export interface AiChatRequest {
  message: string;
  conversationId?: string;
}

export interface AiChatResponse {
  reply: string;
  conversationId: string;
  conversationTitle: string;
  provider: string;
  model: string;
}

export interface AiStatusResponse {
  configured: boolean;
  provider: string;
  model: string;
  message: string;
}
