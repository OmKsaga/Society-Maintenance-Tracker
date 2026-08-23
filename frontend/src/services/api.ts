import type {
  AuthToken,
  User,
  Complaint,
  ComplaintPriority,
  ComplaintStatus,
  DashboardStats,
  Notice,
  Settings,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function getToken(): string | null {
  return localStorage.getItem('access_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || JSON.stringify(body);
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authApi = {
  register: (name: string, email: string, password: string): Promise<AuthToken> =>
    fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    }).then(handleResponse<AuthToken>),

  login: (email: string, password: string): Promise<AuthToken> =>
    fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse<AuthToken>),

  me: (): Promise<User> =>
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { ...authHeaders() },
    }).then((res) => handleResponse<User>(res)),
};

// ─── Complaints ────────────────────────────────────────────────────────────

export const complaintsApi = {
  createComplaint: (formData: FormData): Promise<Complaint> =>
    fetch(`${BASE_URL}/api/complaints`, {
      method: 'POST',
      headers: { ...authHeaders() },
      body: formData,
    }).then(handleResponse<Complaint>),

  getMyComplaints: (): Promise<Complaint[]> =>
    fetch(`${BASE_URL}/api/complaints/my`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<Complaint[]>),

  getComplaint: (id: number): Promise<Complaint> =>
    fetch(`${BASE_URL}/api/complaints/${id}`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<Complaint>),

  // Admin
  getAllComplaints: (params?: {
    category?: string;
    status_filter?: string;
    date_filter?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<Complaint[]> => {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.status_filter) query.set('status_filter', params.status_filter);
    if (params?.date_filter) query.set('date_filter', params.date_filter);
    if (params?.date_from) query.set('date_from', params.date_from);
    if (params?.date_to) query.set('date_to', params.date_to);
    return fetch(`${BASE_URL}/api/admin/complaints?${query}`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<Complaint[]>);
  },

  updateStatus: (id: number, status: ComplaintStatus, note?: string): Promise<Complaint> =>
    fetch(`${BASE_URL}/api/admin/complaints/${id}/status`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    }).then(handleResponse<Complaint>),

  updatePriority: (id: number, priority: ComplaintPriority): Promise<Complaint> =>
    fetch(`${BASE_URL}/api/admin/complaints/${id}/priority`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    }).then(handleResponse<Complaint>),

  getOverdue: (): Promise<Complaint[]> =>
    fetch(`${BASE_URL}/api/admin/complaints/overdue`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<Complaint[]>),
};

// ─── Notices ───────────────────────────────────────────────────────────────

export const noticesApi = {
  getNotices: (): Promise<Notice[]> =>
    fetch(`${BASE_URL}/api/notices`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<Notice[]>),

  createNotice: (title: string, content: string, is_important: boolean): Promise<Notice> =>
    fetch(`${BASE_URL}/api/admin/notices`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, is_important }),
    }).then(handleResponse<Notice>),

  deleteNotice: (id: number): Promise<void> =>
    fetch(`${BASE_URL}/api/admin/notices/${id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    }).then(handleResponse<void>),
};

// ─── Admin ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getDashboard: (): Promise<DashboardStats> =>
    fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<DashboardStats>),

  getSettings: (): Promise<Settings> =>
    fetch(`${BASE_URL}/api/admin/settings`, {
      headers: { ...authHeaders() },
    }).then(handleResponse<Settings>),

  updateSettings: (overdue_days: number): Promise<Settings> =>
    fetch(`${BASE_URL}/api/admin/settings`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ overdue_days }),
    }).then(handleResponse<Settings>),
};
