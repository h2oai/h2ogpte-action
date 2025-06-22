export interface FetchWithRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export interface AgentKey {
  createdAt: string;
  description: string;
  id: string;
  name: string;
  ownerEmail: string;
  type: string;
  updatedAt: string;
}

export type AgentKeys = Array<AgentKey>;

export interface ToolAssociation {
  associateId: string;
  keyId: string;
  name: string;
  userId: string;
}

export interface ToolAssociations {
  keys: Array<ToolAssociation>;
  tool: string;
}

export interface ChatSession {
  id: string;
  updatedAt: string;
}

export interface ChatResponse {
  success: boolean;
  body: string;
}

export interface H2oRawResponse {
  body: string;
}
