import { auth } from './firebase.ts';

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string = 'API_ERROR', status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function getAuthHeader(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      };
    } catch (err) {
      console.error('Failed to get Firebase ID token:', err);
    }
  }

  return {
    'Content-Type': 'application/json',
  };
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = await getAuthHeader();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let errorData: any = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }

    const message = errorData?.error?.message || response.statusText || 'Request failed';
    const code = errorData?.error?.code || `HTTP_${response.status}`;
    throw new ApiError(message, code, response.status);
  }

  // Handle 204 or empty response
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Typed API operations
export const api = {
  // Auth & Gym
  getMe: () => apiRequest('/api/auth/me'),
  registerGym: (data: any) => 
    apiRequest('/api/auth/register-gym', { method: 'POST', body: JSON.stringify(data) }),
  syncUser: (data: { name?: string; role?: string }) => 
    apiRequest('/api/auth/sync', { method: 'POST', body: JSON.stringify(data) }),
  getGym: () => apiRequest('/api/gym'),
  updateGym: (data: any) => apiRequest('/api/gym', { method: 'PUT', body: JSON.stringify(data) }),

  // Members
  getMembers: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/members${query ? `?${query}` : ''}`);
  },
  getMember: (id: string) => apiRequest(`/api/members/${id}`),
  createMember: (data: any) => apiRequest('/api/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: any) => apiRequest(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string) => apiRequest(`/api/members/${id}`, { method: 'DELETE' }),

  // Plans
  getPlans: () => apiRequest('/api/plans'),
  createPlan: (data: any) => apiRequest('/api/plans', { method: 'POST', body: JSON.stringify(data) }),
  updatePlan: (id: string, data: any) => apiRequest(`/api/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlan: (id: string) => apiRequest(`/api/plans/${id}`, { method: 'DELETE' }),

  // Memberships
  getMemberships: (params?: { memberId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/memberships${query ? `?${query}` : ''}`);
  },
  renewMembership: (data: any) => apiRequest('/api/memberships/renew', { method: 'POST', body: JSON.stringify(data) }),

  // Payments
  getPayments: (params?: { memberId?: string; paymentMethod?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/payments${query ? `?${query}` : ''}`);
  },
  createPayment: (data: any) => apiRequest('/api/payments', { method: 'POST', body: JSON.stringify(data) }),
  refundPayment: (id: string) => apiRequest(`/api/payments/${id}/refund`, { method: 'POST' }),

  // Expenses
  getExpenses: (params?: { category?: string; month?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/expenses${query ? `?${query}` : ''}`);
  },
  createExpense: (data: any) => apiRequest('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id: string, data: any) => apiRequest(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => apiRequest(`/api/expenses/${id}`, { method: 'DELETE' }),

  // Notifications
  getNotifications: () => apiRequest('/api/notifications'),
  markNotificationRead: (id: string) => apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => apiRequest('/api/notifications/read-all', { method: 'PUT' }),
  clearNotifications: () => apiRequest('/api/notifications/clear', { method: 'DELETE' }),

  // Dashboard & Analytics
  getDashboard: () => apiRequest('/api/dashboard'),
  getReports: (params?: { period?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/reports${query ? `?${query}` : ''}`);
  },

  // Search
  search: (query: string) => apiRequest(`/api/search?q=${encodeURIComponent(query)}`),

  // Backup Export
  exportBackup: () => apiRequest('/api/backup/export'),

  // Audit Logs (Owner only)
  getAuditLogs: (params?: { limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/audit${query ? `?${query}` : ''}`);
  },

  // Member Invitation (Owner/Manager)
  inviteMember: (id: string) => apiRequest(`/api/members/${id}/invite`, { method: 'POST' }),

  // Member Portal Endpoints
  getMemberDashboard: () => apiRequest('/api/member/dashboard'),
  getMemberProfile: () => apiRequest('/api/member/profile'),
  updateMemberProfile: (data: any) => apiRequest('/api/member/profile', { method: 'PATCH', body: JSON.stringify(data) }),
  getMemberMembership: () => apiRequest('/api/member/membership'),
  getMemberPayments: () => apiRequest('/api/member/payments'),
  getMemberAttendance: () => apiRequest('/api/member/attendance'),
  memberCheckIn: (data?: { checkInMethod?: string; notes?: string }) => 
    apiRequest('/api/member/attendance/check-in', { method: 'POST', body: JSON.stringify(data || {}) }),
  getMemberWorkouts: () => apiRequest('/api/member/workouts'),
  updateMemberWorkout: (id: string, data: any) => 
    apiRequest(`/api/member/workouts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getMemberActivity: (params?: { 
    type?: string; 
    from?: string; 
    to?: string; 
    date?: string; 
    search?: string; 
    limit?: number; 
    offset?: number; 
    page?: number; 
  }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/member/activity${query ? `?${query}` : ''}`);
  },
  getMemberActivityCalendar: (params?: { month?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/api/member/activity/calendar${query ? `?${query}` : ''}`);
  },
  linkMemberAccount: (invitationToken: string) => 
    apiRequest('/api/member/link-account', { method: 'POST', body: JSON.stringify({ invitationToken }) }),

  // Community Feed Endpoints
  getCommunityFeed: () => apiRequest('/api/community/feed'),
  createCommunityPost: (data: { content: string; mediaUrl?: string; postType?: string; isPinned?: boolean }) => 
    apiRequest('/api/community/posts', { method: 'POST', body: JSON.stringify(data) }),
  deleteCommunityPost: (id: string) => apiRequest(`/api/community/posts/${id}`, { method: 'DELETE' }),
  addCommunityComment: (postId: string, content: string) => 
    apiRequest(`/api/community/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteCommunityComment: (commentId: string) => 
    apiRequest(`/api/community/comments/${commentId}`, { method: 'DELETE' }),
  toggleCommunityReaction: (postId: string, reactionType: string = 'LIKE') => 
    apiRequest(`/api/community/posts/${postId}/reactions`, { method: 'POST', body: JSON.stringify({ reactionType }) }),
  reportCommunityPost: (postId: string, reason: string) => 
    apiRequest(`/api/community/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason }) }),
};
