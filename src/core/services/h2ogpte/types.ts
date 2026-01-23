export interface FetchWithRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeoutMs?: number;
}

export interface H2ogpteConfig {
  llm: string;
  agent_max_turns: string;
  agent_accuracy: string;
  agent_total_timeout: number;
}

export interface AgentKey {
  id: string;
  name: string;
  type: "private" | "shared" | "built_in";
  description?: string;
  created_at?: string;
  updated_at?: string;
  owner_email?: string;
}

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
  name?: string;
  collection_id?: string;
  collection_name?: string;
  prompt_template_id?: string;
  latest_message_content?: string;
  updated_at: string;
}

export interface ChatResponse {
  success: boolean;
  body: string;
}

export interface StreamingChunk {
  body: string;
  finished: boolean;
  [key: string]: unknown;
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

export type PiiDetectionAction = "redact" | "allow" | "fail";

export interface GuardRailsSettings {
  disallowed_regex_patterns?: string[];
  presidio_labels_to_flag?: string[];
  pii_labels_to_flag?: string[];

  pii_detection_parse_action?: PiiDetectionAction;
  pii_detection_llm_input_action?: PiiDetectionAction;
  pii_detection_llm_output_action?: PiiDetectionAction;

  exception_message?: string;

  prompt_guard_labels_to_flag?: string[];

  guardrails_labels_to_flag?: string[];
  guardrails_llm?: string;
  guardrails_safe_category?: string;

  guardrails_entities?: Record<string, string>;
}
