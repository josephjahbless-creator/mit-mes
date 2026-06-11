import api from './client';

export const authApi = {
  login:          (data) => api.post('/auth/login', data),
  logout:         (refreshToken) => api.post('/auth/logout', { refreshToken }),
  me:             () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  requestAccount: (data) => api.post('/auth/request-account', data),
};

export const userRequestsApi = {
  list:         (params) => api.get('/user-requests', { params }),
  pendingCount: ()       => api.get('/user-requests/count'),
  approve:      (id, data) => api.post(`/user-requests/${id}/approve`, data),
  reject:       (id, data) => api.post(`/user-requests/${id}/reject`, data),
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
  toggleActive: (id) => api.patch(`/users/${id}/toggle-active`),
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
  getStats: () => api.get('/indicators/stats'),
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
  uploadFiles: (formData) => api.post('/uploads', formData, { headers: { 'Content-Type': undefined } }),
  previewImport: (formData) => api.post('/data-entry/import/preview', formData, { headers: { 'Content-Type': undefined } }),
  bulkImport: (formData) => api.post('/data-entry/import/bulk', formData, { headers: { 'Content-Type': undefined } }),
  downloadTemplate: () => api.get('/data-entry/import/template', { responseType: 'blob' }),
  // Result Framework import (creates framework + records period actuals)
  frameworkTemplate: () => api.get('/data-entry/import/framework/template', { responseType: 'blob' }),
  frameworkPreview: (formData) => api.post('/data-entry/import/framework/preview', formData, { headers: { 'Content-Type': undefined } }),
  frameworkImport: (formData) => api.post('/data-entry/import/framework', formData, { headers: { 'Content-Type': undefined } }),
  completeness: (params) => api.get('/data-entry/completeness', { params }),
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
  exportExcel:     (data) => api.post('/reports/export/excel',      data, { responseType: 'blob' }),
  exportPdf:       (data) => api.post('/reports/export/pdf',        data, { responseType: 'text' }),
  exportPdfServer: (data) => api.post('/reports/export/pdf-server', data, { responseType: 'arraybuffer' }),
  exportDocx:      (data) => api.post('/reports/export/docx',       data, { responseType: 'blob' }),
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
  upload:  (formData)   => api.post('/documents', formData, { headers: { 'Content-Type': undefined } }),
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
  trends:          (params) => api.get('/analytics/trends', { params }),
  rankings:        (params) => api.get('/analytics/rankings', { params }),
  forecasting:     (params) => api.get('/analytics/forecasting', { params }),
  matrix:          (params) => api.get('/analytics/performance-matrix', { params }),
  summary:         (params) => api.get('/analytics/summary', { params }),
  descriptive:     (params) => api.get('/analytics/descriptive', { params }),
  variance:        (params) => api.get('/analytics/variance', { params }),
  disaggregation:  (params) => api.get('/analytics/disaggregation', { params }),
  costBenefit:     (params) => api.get('/analytics/cost-benefit', { params }),
  rbmLogframe:     (params) => api.get('/analytics/rbm-logframe', { params }),
  aiAnomalies:     (params) => api.get('/analytics/ai/anomalies', { params }),
  aiRiskScores:    (params) => api.get('/analytics/ai/risk-scores', { params }),
  aiForecasting:   (params) => api.get('/analytics/ai/forecasting', { params }),
  aiRunAlerts:     (data)   => api.post('/analytics/ai/run-alerts', data),
};

export const swotApi = {
  list:   (params) => api.get('/swot', { params }),
  create: (data)   => api.post('/swot', data),
  update: (id, data) => api.patch(`/swot/${id}`, data),
  remove: (id)     => api.delete(`/swot/${id}`),
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

export const auditApi = {
  list:  (params) => api.get('/audit-logs', { params }),
  stats: ()       => api.get('/audit-logs/stats'),
};

export const tocApi = {
  get:             (level, referenceId) => api.get(`/toc/${level}/${referenceId}`),
  upsert:          (data)    => api.post('/toc', data),
  listAll:         ()        => api.get('/toc'),
  addAssumption:   (tocId, data) => api.post(`/toc/${tocId}/assumptions`, data),
  deleteAssumption:(id)      => api.delete(`/toc/assumptions/${id}`),
  addRisk:         (tocId, data) => api.post(`/toc/${tocId}/risks`, data),
  deleteRisk:      (id)      => api.delete(`/toc/risks/${id}`),
};

export const twoFactorApi = {
  status:    ()     => api.get('/auth/2fa/status'),
  setup:     ()     => api.post('/auth/2fa/setup'),
  verify:    (data) => api.post('/auth/2fa/verify', data),
  disable:   (data) => api.post('/auth/2fa/disable', data),
  challenge: (data) => api.post('/auth/2fa/challenge', data),
};

// ── Dira ya Taifa 2050 Strategic Integration (mounted at /api/v1) ──────────────
export const flagshipsApi = {
  listObjectives:       (params) => api.get('/v1/strategic-objectives', { params }),
  getObjective:         (id) => api.get(`/v1/strategic-objectives/${id}`),
  getObjectiveProgress: (id, params) => api.get(`/v1/strategic-objectives/${id}/progress`, { params }),
  dashboard:            () => api.get('/v1/dashboard/flagship-status'),
  linkProject:          (id, data) => api.post(`/v1/strategic-objectives/${id}/link-project`, data),
  unlinkProject:        (id, projectId) => api.delete(`/v1/strategic-objectives/${id}/link-project/${projectId}`),
  projectFlagships:     (projectId) => api.get(`/v1/projects/${projectId}/flagships`),
  listReforms:          (params) => api.get('/v1/foundational-reforms', { params }),
  integrationStatus:    () => api.get('/v1/integration-status'),
  recalculateIndicator: (id, data) => api.post(`/v1/indicators/${id}/recalculate`, data),
  calculationTrace:     (id) => api.get(`/v1/indicators/${id}/calculation-trace`),
  completeActivity:     (id, data) => api.post(`/v1/activities/${id}/complete`, data),
  createMapping:        (data) => api.post('/v1/activity-indicator-mappings', data),
  deleteMapping:        (id) => api.delete(`/v1/activity-indicator-mappings/${id}`),
  listMappings:         (indicatorId) => api.get(`/v1/indicators/${indicatorId}/mappings`),
  indicatorPerformance: (indicatorId) => api.get(`/v1/indicators/${indicatorId}/performance`),
  activitiesLite:       (params) => api.get('/v1/activities-lite', { params }),
  cascadeAnalysis:      (params) => api.get('/v1/reports/cascade-analysis', { params }),
  dataQuality:          () => api.get('/v1/reports/data-quality'),
};

export const externalIntegrationsApi = {
  list:          ()              => api.get('/external-integrations'),
  get:           (system)        => api.get(`/external-integrations/${system}`),
  configure:     (system, data)  => api.put(`/external-integrations/${system}`, data),
  testConnection:(system)        => api.post(`/external-integrations/${system}/test`),
  sync:          (system)        => api.post(`/external-integrations/${system}/sync`),
  getLogs:       (system)        => api.get(`/external-integrations/${system}/logs`),
  ssoStatus:     ()              => api.get('/auth/sso/status'),
};

export const mtefApi = {
  list:    (params) => api.get('/mtef', { params }),
  summary: ()       => api.get('/mtef/summary'),
  create:  (data)   => api.post('/mtef', data),
  update:  (id, d)  => api.patch(`/mtef/${id}`, d),
  remove:  (id)     => api.delete(`/mtef/${id}`),
};

export const emailReportsApi = {
  list:    ()           => api.get('/email-reports'),
  create:  (data)       => api.post('/email-reports', data),
  update:  (id, data)   => api.patch(`/email-reports/${id}`, data),
  remove:  (id)         => api.delete(`/email-reports/${id}`),
  trigger: (id)         => api.post(`/email-reports/${id}/trigger`),
};

export const smsApi = {
  config: ()           => api.get('/sms/config'),
  logs:   (params)     => api.get('/sms/logs', { params }),
  send:   (data)       => api.post('/sms/send', data),
};

export const customFormsApi = {
  list:         ()           => api.get('/custom-forms'),
  get:          (id)         => api.get(`/custom-forms/${id}`),
  create:       (data)       => api.post('/custom-forms', data),
  update:       (id, data)   => api.patch(`/custom-forms/${id}`, data),
  remove:       (id)         => api.delete(`/custom-forms/${id}`),
  submit:       (id, data)   => api.post(`/custom-forms/${id}/submit`, data),
  getResponses: (id)         => api.get(`/custom-forms/${id}/responses`),
};

export const iatiApi = {
  downloadActivities: () => api.get('/iati/activities.xml', { responseType: 'blob' }),
  downloadResults:    () => api.get('/iati/results.xml',    { responseType: 'blob' }),
};

export const disaggregationApi = {
  list:       ()       => api.get('/disaggregation'),
  getOptions: (id)     => api.get(`/disaggregation/${id}/options`),
};

// ── Local AI (Ollama) analysis & insights ─────────────────────────────────────
export const aiApi = {
  status:        ()      => api.get('/ai/status'),
  analyze:       (data)  => api.post('/ai/analyze', data),
  chat:          (data)  => api.post('/ai/chat', data),
  reportSummary: (data)  => api.post('/ai/report-summary', data),
  explainAnomaly:(indicatorId, data) => api.post(`/ai/explain-anomaly/${indicatorId}`, data),
};

export const insightsApi = {
  list:                (params) => api.get('/insights', { params }),
  getSubmission:       (actualId) => api.get(`/insights/submission/${actualId}`),
  getIndicator:        (indicatorId, params) => api.get(`/insights/indicator/${indicatorId}`, { params }),
  markRead:            (ids) => api.patch('/insights/mark-read', { ids }),
  dismiss:             (id)  => api.patch(`/insights/${id}/dismiss`),
  triggerNational:     (data) => api.post('/insights/trigger-national', data),
};
