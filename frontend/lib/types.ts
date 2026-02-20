export type JobStatus = "pending" | "processing" | "completed" | "failed";

export interface JobConfig {
  provider: string;
  model?: string;
  language: string;
  start_page?: number;
  end_page?: number;
  table_extraction: boolean;
  storage: string;
  s3_bucket?: string;
  s3_prefix?: string;
  storage_path?: string;
}

export interface JobProgress {
  current_page: number;
  total_pages: number;
  images_processed: number;
  phase: string;
  message: string;
}

export interface JobResult {
  markdown_path: string;
  metadata_path: string;
  image_count: number;
  images_dir: string;
}

export interface Job {
  id: string;
  filename: string;
  status: JobStatus;
  config: JobConfig;
  progress?: JobProgress;
  result?: JobResult;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderInfo {
  name: string;
  display_name: string;
  default_model: string;
  models: string[];
  cost_per_image_usd: number;
}

export interface LanguageInfo {
  code: string;
  name: string;
}

export interface ConfigResponse {
  providers: ProviderInfo[];
  languages: LanguageInfo[];
  storage_backends: string[];
}

export interface UploadResponse {
  job_id: string;
  message: string;
}

export interface ResultsResponse {
  job_id: string;
  markdown?: string;
  metadata?: Record<string, unknown>[];
  image_count: number;
}

// Deploy types

export type ImageTargetType = "local_folder" | "s3" | "scp";
export type MarkdownTargetType = "local_folder" | "flowise";

export type ImageTarget =
  | { type: "local_folder"; path: string }
  | { type: "s3"; bucket: string; prefix: string; region?: string }
  | { type: "scp"; host: string; port?: number; username: string; private_key_path?: string; remote_path: string };

export type MarkdownTarget =
  | { type: "local_folder"; path: string }
  | { type: "flowise"; base_url: string; api_key: string; store_id: string };

export interface DeployRequest {
  image_base_url: string;
  image_target?: ImageTarget;
  markdown_target?: MarkdownTarget;
}

export interface DeployStepResult {
  target_type: string;
  detail: string;
}

export interface DeployResponse {
  success: boolean;
  image_result?: DeployStepResult;
  markdown_result?: DeployStepResult;
  errors: string[];
}
