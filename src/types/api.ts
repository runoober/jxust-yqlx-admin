// ---- API Envelope ----
export interface ApiResponse<T> {
  StatusCode: number;
  StatusMessage: string;
  RequestId: string;
  Result: T;
}

export interface ErrorResponse {
  StatusCode: number;
  StatusMessage: string;
  RequestId: string;
}

// ---- Pagination ----
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

// ---- Auth ----
export interface LoginRequest {
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  access_token_expires_at: number;
  user_info: UserProfile;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// ---- User ----
export interface UserProfile {
  id: number;
  nickname: string;
  avatar: string;
  phone: string;
  real_name: string;
  student_id: string;
  class_id: string;
  college: string;
  major: string;
  role: number;
  role_tags: string[];
  status: number;
  created_at: string;
  updated_at: string;
}

export interface UserSimple {
  id: number;
  nickname: string;
}

export interface UserAuthDetail {
  user_info: UserProfile;
  session_count: number;
  devices: AuthSession[];
  block_type: string;
  block_reason: string;
  block_expires_at: number;
}

export interface AuthSession {
  sid: string;
  client_type: string;
  device_type: string;
  issued_at: number;
  expires_at: number;
  last_refresh_at: number;
}

// ---- RBAC ----
export interface Role {
  id: number;
  name: string;
  role_tag: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  permission_tag: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface RoleWithPermissions {
  role: Role;
  permissions: Permission[];
}

export interface RolesWithPermissions {
  roles: RoleWithPermissions[];
}

export interface RoleWithUsers {
  role: Role;
  user_count: number;
  user_ids: number[];
}

export interface UserPermissionsResult {
  user_id: number;
  permissions: Permission[];
}

// ---- Notifications ----
export interface NotificationCategory {
  id: number;
  name: string;
  is_active: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  title: string;
  content: string;
  status: number;
  categories: NotificationCategory[];
  publisher_id: number;
  publisher?: UserSimple | null;
  publisher_type: number;
  contributor_id?: number | null;
  contributor?: UserSimple | null;
  is_pinned: boolean;
  pinned_at?: string | null;
  published_at?: string | null;
  view_count: number;
  schedule?: ScheduleData | null;
  approval_summary?: NotificationApprovalSummary | null;
  approvals?: NotificationApproval[];
  created_at: string;
  updated_at: string;
}

export interface NotificationApproval {
  id: number;
  status: number;
  note: string;
  reviewer: UserSimple;
  created_at: string;
}

export interface NotificationApprovalSummary {
  total_reviewers: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  approval_rate: number;
  required_rate: number;
  can_publish: boolean;
  approved_users: UserSimple[];
  rejected_users: UserSimple[];
  pending_users: UserSimple[];
}

export interface NotificationStats {
  total_count: number;
  draft_count: number;
  pending_count: number;
  published_count: number;
}

export interface ScheduleData {
  title: string;
  description: string;
  time_slots: ScheduleTimeSlot[];
}

export interface ScheduleTimeSlot {
  name: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
}

// ---- Features ----
export interface Feature {
  id: number;
  feature_key: string;
  feature_name: string;
  description: string;
  is_enabled: boolean;
  user_ids: number[];
  role_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface UserFeatureInfo {
  feature_key: string;
  feature_name: string;
}

export interface WhitelistUserInfo {
  user_id: number;
  student_id: string;
  real_name: string;
}

// ---- Organizations ----
export interface Organization {
  id: number;
  name: string;
  organization_type: string;
  affiliation: string;
  campus: string;
  introduction: string;
  contact: string;
  created_at: string;
  updated_at: string;
}

// ---- Contributions ----
export interface Contribution {
  id: number;
  title: string;
  content: string;
  status: number;
  user_id: number;
  user?: UserSimple | null;
  categories: NotificationCategory[];
  notification_id?: number | null;
  notification?: NotificationSimple | null;
  reviewer_id?: number | null;
  reviewer?: UserSimple | null;
  review_note: string;
  points_awarded: number;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSimple {
  id: number;
  title: string;
  status: number;
  is_pinned: boolean;
  pinned_at?: string | null;
  published_at?: string | null;
  publisher_id: number;
  view_count: number;
  categories: NotificationCategory[];
  schedule?: ScheduleData | null;
  approval_summary?: NotificationApprovalSummary | null;
  created_at: string;
}

export interface ContributionStats {
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  total_points: number;
}

// ---- Teacher Reviews ----
export interface TeacherReview {
  id: number;
  teacher_name: string;
  course_name: string;
  campus: string;
  content: string;
  attitude: number;
  status: number;
  user_id: number;
  admin_note: string;
  created_at: string;
  updated_at: string;
}

// ---- Materials ----
export interface MaterialDetail {
  id: number;
  file_name: string;
  file_size: number;
  md5: string;
  category_id: number;
  category_name: string;
  category_path: string;
  description: string;
  tags: string;
  external_link: string;
  is_recommended: boolean;
  download_count: number;
  view_count: number;
  total_hotness: number;
  rating: number;
  rating_count: number;
  user_rating?: number | null;
  created_at: string;
}

export interface MaterialListItem {
  id: number;
  file_name: string;
  file_size: number;
  md5: string;
  category_id: number;
  tags: string;
  download_count: number;
  total_hotness: number;
  period_hotness: number;
  created_at: string;
}

export interface MaterialSearchResult {
  keywords: string;
  materials: MaterialListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface MaterialCategory {
  id: number;
  name: string;
  parent_id: number;
  level: number;
  sort: number;
  material_count: number;
  children: MaterialCategory[];
  created_at: string;
}

export interface HotWord {
  keywords: string;
  count: number;
}

// ---- Heroes ----
export interface Hero {
  id: number;
  name: string;
  is_show: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
}

// ---- System Config ----
export interface SystemConfig {
  id: number;
  key: string;
  value: string;
  value_type: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface ConfigResponse {
  id: number;
  key: string;
  value: string;
  value_type: string;
  description: string;
}

// ---- Points ----
export interface PointsTransaction {
  id: number;
  user_id: number;
  user?: UserSimple | null;
  points: number;
  type: number;
  source: string;
  description: string;
  related_id?: number | null;
  created_at: string;
}

export interface UserPoints {
  user_id: number;
  user?: UserSimple | null;
  points: number;
}

export interface PointsStats {
  points: number;
  rank: number;
  source_stats: Record<string, Record<string, number>>;
}

// ---- Course Tables ----
export interface CourseTable {
  id: number;
  class_id: string;
  semester: string;
  course_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ---- Fail Rates ----
export interface FailRate {
  id: number;
  course_name: string;
  department: string;
  semester: string;
  failrate: number;
  created_at: string;
  updated_at: string;
}

// ---- Stats ----
export interface SystemOnlineStat {
  online_count: number;
}

export interface ProjectOnlineStat {
  project_id: number;
  online_count: number;
}

export interface AllProjectsOnlineStatItem {
  project_id: number;
  project_name: string;
  online_count: number;
}

export interface AllProjectsOnlineStatResponse {
  projects: AllProjectsOnlineStatItem[];
}

export interface QuestionProject {
  id: number;
  name: string;
  description: string;
  version?: number;
  is_active: boolean;
  question_count?: number;
  sort: number;
  usage_count?: number;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionItem {
  id: number;
  project_id: number;
  parent_id: number | null;
  type: number;
  title: string;
  options: string[];
  answer: string;
  sort: number;
  is_active: boolean;
  sub_questions?: QuestionItem[];
  practice_count?: number;
  study_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserGroupedCountStat {
  user_id: number;
  count: number;
}

export interface PomodoroRankingItem {
  nickname: string;
  pomodoro_count: number;
  rank: number;
}

// ---- Agent Chat ----
export interface ChatConversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
}

export interface ChatConversationListResponse {
  total: number;
  page: number;
  page_size: number;
  conversations: ChatConversation[];
}

export interface ChatToolCall {
  type?: string;
  id?: string;
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface ChatMessage {
  role: "user" | "assistant" | "tool" | "system" | string;
  content: string;
  tool_calls?: ChatToolCall[] | null;
  tool_call_id?: string;
  reasoning_content?: string;
}

export interface ChatExportResponse {
  conversation: ChatConversation;
  messages: ChatMessage[];
}
