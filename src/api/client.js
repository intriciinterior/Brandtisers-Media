const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('it_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = (data && data.error) || (typeof data === 'string' ? data : 'Request failed');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // 1. Authentication
  async login(login, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login, password })
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async initialSetup(setupData) {
    const res = await fetch(`${API_BASE}/auth/initial-setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(setupData)
    });
    return handleResponse(res);
  },

  async changePassword(current_password, new_password, confirm_password) {
    const res = await fetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ current_password, new_password, confirm_password })
    });
    return handleResponse(res);
  },

  async getPasswordRequestStatus() {
    const res = await fetch(`${API_BASE}/auth/password-request-status`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async impersonate(target_user_id) {
    const res = await fetch(`${API_BASE}/auth/impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ target_user_id })
    });
    return handleResponse(res);
  },

  async exitImpersonate() {
    const res = await fetch(`${API_BASE}/auth/exit-impersonate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // 2. Company & System Settings
  async getCompanySettings() {
    const res = await fetch(`${API_BASE}/settings/company`);
    return handleResponse(res);
  },

  async updateCompanySettings(data) {
    const res = await fetch(`${API_BASE}/settings/company`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getAdminProfile() {
    const res = await fetch(`${API_BASE}/settings/profile`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async updateAdminProfile(data) {
    const res = await fetch(`${API_BASE}/settings/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getEmailSettings() {
    const res = await fetch(`${API_BASE}/settings/email`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async updateEmailSettings(data) {
    const res = await fetch(`${API_BASE}/settings/email`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async testEmail(recipient_email) {
    const res = await fetch(`${API_BASE}/settings/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ recipient_email })
    });
    return handleResponse(res);
  },

  // 3. Dynamic Clients Management
  async getClients(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/clients?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createClient(data) {
    const res = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateClient(id, data) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async toggleClientStatus(id) {
    const res = await fetch(`${API_BASE}/clients/${id}/status`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async deleteClient(id) {
    const res = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // 4. Dynamic Work Types Management
  async getWorkTypes(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/work-types?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createWorkType(data) {
    const res = await fetch(`${API_BASE}/work-types`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateWorkType(id, data) {
    const res = await fetch(`${API_BASE}/work-types/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async toggleWorkTypeStatus(id) {
    const res = await fetch(`${API_BASE}/work-types/${id}/status`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async deleteWorkType(id) {
    const res = await fetch(`${API_BASE}/work-types/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  // 5. Employee Management (Super Admin)
  async getUsers(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/users?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getUserById(id) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createUser(userData) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  async updateUser(id, userData) {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  async toggleUserStatus(id) {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async resetUserPassword(id, payload = {}) {
    // payload can be string (legacy) or object { temporary_password, generate_random }
    const body = typeof payload === 'string' ? { temporary_password: payload } : payload;
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  async getPasswordRequests() {
    const res = await fetch(`${API_BASE}/settings/password-requests`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async approvePasswordRequest(id) {
    const res = await fetch(`${API_BASE}/settings/password-requests/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async rejectPasswordRequest(id, rejection_reason = '') {
    const res = await fetch(`${API_BASE}/settings/password-requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ rejection_reason })
    });
    return handleResponse(res);
  },

  // 6. Tasks
  async getTasks(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/tasks?${query.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getTaskStats(date) {
    const url = date ? `${API_BASE}/tasks/stats?date=${encodeURIComponent(date)}` : `${API_BASE}/tasks/stats`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getTaskById(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async createTask(taskData) {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(taskData)
    });
    return handleResponse(res);
  },

  async updateTask(id, taskData) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(taskData)
    });
    return handleResponse(res);
  },

  async deleteTask(id) {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async updateTaskStatus(id, status) {
    const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status })
    });
    return handleResponse(res);
  },

  async addTaskUpdate(id, { progress, expected_completion, work_update, status }) {
    const res = await fetch(`${API_BASE}/tasks/${id}/updates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ progress, expected_completion, work_update, status })
    });
    return handleResponse(res);
  },

  async completeTask(id, { completion_summary }) {
    const res = await fetch(`${API_BASE}/tasks/${id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ completion_summary })
    });
    return handleResponse(res);
  },

  // 7. Work Reports (Daily/Weekly/Monthly with Quantities, Real Excel Download, Email Send)
  async getDailyWorkReport(date, employeeId = null) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (employeeId) params.append('employee_id', employeeId);
    const res = await fetch(`${API_BASE}/work-reports/daily?${params.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async saveDailyWorkReport(data) {
    const res = await fetch(`${API_BASE}/work-reports/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async getWeeklyWorkReport(startDate, endDate, employeeId = null) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (employeeId) params.append('employee_id', employeeId);
    const res = await fetch(`${API_BASE}/work-reports/weekly?${params.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getMonthlyWorkReport(month, employeeId = null) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (employeeId) params.append('employee_id', employeeId);
    const res = await fetch(`${API_BASE}/work-reports/monthly?${params.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async exportWorkReportExcel(data) {
    const res = await fetch(`${API_BASE}/work-reports/export-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(err.error || 'Failed to download Excel report.');
    }
    const blob = await res.blob();
    return blob;
  },

  async sendWorkReportEmail(data) {
    const res = await fetch(`${API_BASE}/work-reports/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // 8. Super Admin Audit Reports
  async getDailyReport(date, client = 'ALL', work_type = 'ALL') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (client && client !== 'ALL') params.append('client', client);
    if (work_type && work_type !== 'ALL') params.append('work_type', work_type);
    const res = await fetch(`${API_BASE}/reports/daily?${params.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getMonthlyReport(month, client = 'ALL', employeeId = 'ALL', status = 'ALL', work_type = 'ALL') {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (client && client !== 'ALL') params.append('client', client);
    if (employeeId && employeeId !== 'ALL') params.append('employee_id', employeeId);
    if (status && status !== 'ALL') params.append('status', status);
    if (work_type && work_type !== 'ALL') params.append('work_type', work_type);
    const res = await fetch(`${API_BASE}/reports/monthly?${params.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async exportAdminReportExcel(data) {
    const res = await fetch(`${API_BASE}/reports/export-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Export failed' }));
      throw new Error(err.error || 'Failed to download Excel report.');
    }
    const blob = await res.blob();
    return blob;
  },

  async sendAdminReportEmail(data) {
    const res = await fetch(`${API_BASE}/reports/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  // 9. Notifications & Activities
  async getNotifications() {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead() {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async getActivities(limit = 100) {
    const res = await fetch(`${API_BASE}/activity?limit=${limit}`, {
      headers: { ...getAuthHeader() }
    });
    return handleResponse(res);
  },

  async uploadFile(formData) {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: formData
    });
    return handleResponse(res);
  }
};
