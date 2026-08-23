// User types
export type UserRole = 'RESIDENT' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

// Auth types
export interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

// Complaint types
export type ComplaintCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'CLEANING'
  | 'SECURITY'
  | 'LIFT_ELEVATOR'
  | 'WATER_SUPPLY'
  | 'PARKING'
  | 'COMMON_AREA'
  | 'OTHER';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface ComplaintHistory {
  id: number;
  old_status: ComplaintStatus | null;
  new_status: ComplaintStatus;
  note: string | null;
  created_at: string;
  actor: User;
}

export interface Complaint {
  id: number;
  resident_id: number;
  category: ComplaintCategory;
  description: string;
  photo_url: string | null;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  is_overdue: boolean;
  resident: User | null;
  history: ComplaintHistory[];
}

// Notice types
export interface Notice {
  id: number;
  title: string;
  content: string;
  is_important: boolean;
  created_by: number;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
}

// Settings
export interface Settings {
  id: number;
  overdue_days: number;
  updated_at: string;
  updated_by: number | null;
}

// Dashboard
export interface DashboardStats {
  total_complaints: number;
  open_complaints: number;
  in_progress_complaints: number;
  resolved_complaints: number;
  overdue_complaints: number;
  by_category: Record<string, number>;
}

// Display helpers
export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  CLEANING: 'Cleaning',
  SECURITY: 'Security',
  LIFT_ELEVATOR: 'Lift / Elevator',
  WATER_SUPPLY: 'Water Supply',
  PARKING: 'Parking',
  COMMON_AREA: 'Common Area',
  OTHER: 'Other',
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ComplaintCategory[];
