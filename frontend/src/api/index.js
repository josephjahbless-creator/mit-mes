import api from './client';

export const authApi = {
  login:          (data) => api.post('/auth/login', data),
  logout:         (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me:             () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
};

export const institutionsApi = {
  list: () => api.get('/institutions'),
  get: (id) => api.get(`/institutions/${id}`),
  create: (data) => api.post('/institutions', data),
  update: (id, data) => api.patch(`/institutions/${id}`, data),
  regenerateKey: (id) => api.post(`/institutions/${id}/regenerate-key`),
};

export const usersApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  resetPassword: (id, data) => api.patch(`/users/${id}/reset-password`, data),
};

export const frameworkApi = {
  listObjectives: (params) => api.get('/framework/objectives', { params }),
  getObjectiveTree: (id) => api.get(`/framework/objectives/${id}/tree`),
  getChain: (params) => api.get('/framework/chain', { params }),
  createObjective: (data) => api.post('/framework/objectives', data),
  updateObjective: (id, data) => api.patch(`/framework/objectives/${id}`, data),
  deleteObjective: (id) => api.delete(`/framework/objectives/${id}`),
  createOutcome: (data) => api.post('/framework/outcomes', data),
  updateOutcome: (id, data) => api.patch(`/framework/outcomes/${id}`, data),
  createOutput: (data) => api.post('/framework/outputs', data),
  updateOutput: (id, data) => api.patch(`/framework/outputs/${id}`, data),
  createActivity: (data) => api.post('/framework/activities', data),
  updateActivity: (id, data) => api.patch(`/framework/activities/${id}`, data),
};

export const indicatorsApi = {
  list: (params) => api.get('/indicators', { params }),
  get: (id) => api.get(`/indicators/${id}`),
  create: (data) => api.post('/indicators', data),
  update: (id, data) => api.patch(`/indicators/${id}`, data),
  getTargets: (id, params) => api.get(`/indicators/${id}/targets`, { params }),
  getAllTargets: (params) => api.get('/indicators/all-targets', { params }),
  setTargets: (id, data) => api.post(`/indicators/${id}/targets`, data),
  getActuals: (id, institutionId, params) => api.get(`/indicators/${id}/actuals/${institutionId}`, { params }),
};

export const dataEntryApi = {
  listActuals: (params) => api.get('/data-entry/actuals', { params }),
  getActual: (id) => api.get(`/data-entry/actuals/${id}`),
  getCalculated: (id) => api.get(`/data-entry/actuals/${id}/calculated`),
  submit: (data) => api.post('/data-entry/actuals', data),
  update: (id, data) => api.patch(`/data-entry/actuals/${id}`, data),
  approve: (id) => api.patch(`/data-entry/actuals/${id}/approve`),
  reject: (id, data) => api.patch(`/data-entry/actuals/${id}/reject`, data),
  tracking: (params) => api.get('/data-entry/tracking', { params }),
  listDepartments: () => api.get('/data-entry/departments'),
  uploadFiles: (formData) => api.post('/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const budgetApi = {
  listPlans: (params) => api.get('/budget/plans', { params }),
  getPlan: (id) => api.get(`/budget/plans/${id}`),
  createPlan: (data) => api.post('/budget/plans', data),
  updatePlan: (id, data) => api.patch(`/budget/plans/${id}`, data),
  listExpenditures: (params) => api.get('/budget/expenditures', { params }),
  createExpenditure: (data) => api.post('/budget/expenditures', data),
  approveExpenditure: (id) => api.patch(`/budget/expenditures/${id}/approve`),
  summary: (params) => api.get('/budget/summary', { params }),
};

export const dashboardApi = {
  overview: (params) => api.get('/dashboard/overview', { params }),
  performance: (params) => api.get('/dashboard/performance', { params }),
  institution: (id, params) => api.get(`/dashboard/institution/${id}`, { params }),
  institutionsPerformance: (params) => api.get('/dashboard/institutions-performance', { params }),
  departments: (params) => api.get('/dashboard/departments', { params }),
  industryStatistics: (params) => api.get('/dashboard/industry-statistics', { params }),
  listIndustryStats: (params) => api.get('/dashboard/industry-statistics/list', { params }),
  createIndustryStats: (data) => api.post('/dashboard/industry-statistics', data),
  updateIndustryStats: (id, data) => api.patch(`/dashboard/industry-statistics/${id}`, data),
  deleteIndustryStats: (id) => api.delete(`/dashboard/industry-statistics/${id}`),
  itemizedBudget: (params) => api.get('/dashboard/itemized-budget', { params }),
};

export const projectsApi = {
  list:    (params) => api.get('/projects', { params }),
  get:     (id) => api.get(`/projects/${id}`),
  create:  (data) => api.post('/projects', data),
  update:  (id, data) => api.patch(`/projects/${id}`, data),
  remove:  (id) => api.delete(`/projects/${id}`),
  // Milestones
  createMilestone:  (id, data) => api.post(`/projects/${id}/milestones`, data),
  updateMilestone:  (id, mid, data) => api.patch(`/projects/${id}/milestones/${mid}`, data),
  deleteMilestone:  (id, mid) => api.delete(`/projects/${id}/milestones/${mid}`),
  // Activities
  createActivity:   (id, data) => api.post(`/projects/${id}/activities`, data),
  updateActivity:   (id, aid, data) => api.patch(`/projects/${id}/activities/${aid}`, data),
  deleteActivity:   (id, aid) => api.delete(`/projects/${id}/activities/${aid}`),
  // Expenditures
  createExpenditure: (id, data) => api.post(`/projects/${id}/expenditures`, data),
  updateExpenditure: (id, eid, data) => api.patch(`/projects/${id}/expenditures/${eid}`, data),
  deleteExpenditure: (id, eid) => api.delete(`/projects/${id}/expenditures/${eid}`),
};

export const reportsApi = {
  indicator:    (id, params) => api.get(`/reports/indicator/${id}`, { params }),
  institution:  (id, params) => api.get(`/reports/institution/${id}`, { params }),
  // consolidated: returns hierarchical { objectives, summary, performance }
  // params: fiscalYear, period, ownerType, ownerInstitutionId, ownerDepartmentId, ownerUnitId
  consolidated: (params) => api.get('/reports/consolidated', { params }),
  exportExcel:  (data) => api.post('/reports/export/excel', data, { responseType: 'blob' }),
};

export const integrationsApi = {
  listKeys:       (params) => api.get('/integrations/keys', { params }),
  generateKey:    (data)   => api.post('/integrations/keys', data),
  revokeKey:      (id)     => api.patch(`/integrations/keys/${id}/revoke`),
  reactivateKey:  (id)     => api.patch(`/integrations/keys/${id}/reactivate`),
  deleteKey:      (id)     => api.delete(`/integrations/keys/${id}`),
  listLogs:       (params) => api.get('/integrations/logs', { params }),
  syncStatus:     ()       => api.get('/integrations/status'),
};

export const notificationsApi = {
  list:         (params) => api.get('/notifications', { params }),
  unreadCount:  ()       => api.get('/notifications/unread-count'),
  markRead:     (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:  ()       => api.patch('/notifications/read-all'),
  remove:       (id)     => api.delete(`/notifications/${id}`),
};

export const documentsApi = {
  list:    (params)     => api.get('/documents', { params }),
  get:     (id)         => api.get(`/documents/${id}`),
  upload:  (formData)   => api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:  (id, data)   => api.patch(`/documents/${id}`, data),
  remove:  (id)         => api.delete(`/documents/${id}`),
};

export const periodLocksApi = {
  list:    (params) => api.get('/period-locks', { params }),
  check:   (fy, p)  => api.get(`/period-locks/check/${fy}/${p}`),
  lock:    (data)   => api.post('/period-locks/lock', data),
  unlock:  (data)   => api.post('/period-locks/unlock', data),
};

export const calendarApi = {
  list:    (params) => api.get('/calendar', { params }),
  current: ()       => api.get('/calendar/current'),
  create:  (data)   => api.post('/calendar', data),
  update:  (id, d)  => api.patch(`/calendar/${id}`, d),
  remove:  (id)     => api.delete(`/calendar/${id}`),
};

export const commentsApi = {
  list:   (actualId) => api.get(`/data-entry/actuals/${actualId}/comments`),
  add:    (actualId, data) => api.post(`/data-entry/actuals/${actualId}/comments`, data),
};

export const analyticsApi = {
  trends:      (params) => api.get('/analytics/trends', { params }),
  rankings:    (params) => api.get('/analytics/rankings', { params }),
  forecasting: (params) => api.get('/analytics/forecasting', { params }),
  matrix:      (params) => api.get('/analytics/performance-matrix', { params }),
  summary:     (params) => api.get('/analytics/summary', { params }),
};

export const frameworkVersionsApi = {
  list:       (params) => api.get('/framework-versions', { params }),
  create:     (data)   => api.post('/framework-versions', data),
  approve:    (id)     => api.post(`/framework-versions/${id}/approve`),
  snapshot:   (id)     => api.get(`/framework-versions/${id}/snapshot`),
};

export const workplanApi = {
  list:             (params) => api.get('/workplan', { params }),
  summary:          (params) => api.get('/workplan/summary', { params }),
  get:              (id)     => api.get(`/workplan/${id}`),
  update:           (id, data) => api.patch(`/workplan/${id}`, data),
  createMilestone:  (id, data) => api.post(`/workplan/${id}/milestones`, data),
  updateMilestone:  (id, mid, data) => api.patch(`/workplan/${id}/milestones/${mid}`, data),
  deleteMilestone:  (id, mid) => api.delete(`/workplan/${id}/milestones/${mid}`),
};

export const helpdeskApi = {
  listTickets:   (params) => api.get('/helpdesk/tickets', { params }),
  ticketStats:   ()       => api.get('/helpdesk/tickets/stats'),
  getTicket:     (id)     => api.get(`/helpdesk/tickets/${id}`),
  createTicket:  (data)   => api.post('/helpdesk/tickets', data),
  updateTicket:  (id, data) => api.patch(`/helpdesk/tickets/${id}`, data),
  deleteTicket:  (id)     => api.delete(`/helpdesk/tickets/${id}`),
  listReplies:   (id)     => api.get(`/helpdesk/tickets/${id}/replies`),
  addReply:      (id, data) => api.post(`/helpdesk/tickets/${id}/replies`, data),
  deleteReply:   (id, rid) => api.delete(`/helpdesk/tickets/${id}/replies/${rid}`),
};
