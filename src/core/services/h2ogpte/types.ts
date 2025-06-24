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

export interface Collection {
  id: string;
  name: string;
  description: string;
  embedding_model: string;
  document_count: number;
  document_size: number;
  created_at: string;
  updated_at: string;
  user_count: number;
  is_public: boolean;
  username: string;
  sessions_count: number;
  status: string;
  prompt_template_id: string;
  thumbnail: string;
  size_limit: number;
  expiry_date: string;
  inactivity_interval: number;
  rag_type: string;
  metadata_dict: Record<string, unknown>;
}

export interface UploadResponse {
  id: string;
  filename: string;
}

export interface JobDetailsStatus {
  id: string;
  status: string;
}

export interface JobDetails {
  id: string;
  name: string;
  overall_status: "in progress" | "completed" | "failed" | "canceled";
  status: string;
  passed_percentage: number;
  failed_percentage: number;
  progress: number;
  created_at: string;
  updated_at: string;
  kind: string;
  statuses: JobDetailsStatus[];
  errors: string[];
  duration: string;
  duration_seconds: number;
  canceled_by?: string;
  timeout?: number;
  start_time?: number;
}

export type IngestionJobResponse = JobDetails;

export type JobStatusResponse = JobDetails[];
