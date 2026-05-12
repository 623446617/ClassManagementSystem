import request from './request';

const auth = {
  login: data => request.post('/auth/login', data),
  logout: () => request.post('/auth/logout'),
  getProfile: () => request.get('/auth/profile'),
  updateProfile: data => request.put('/auth/profile', data),
  changePassword: data => request.put('/auth/password', data)
};

const users = {
  list: params => request.get('/users', { params }),
  get: id => request.get(`/users/${id}`),
  create: data => request.post('/users', data),
  update: (id, data) => request.put(`/users/${id}`, data),
  delete: id => request.delete(`/users/${id}`),
  resetPassword: id => request.put(`/users/${id}/reset-password`)
};

const roles = {
  list: () => request.get('/roles'),
  create: data => request.post('/roles', data),
  update: (id, data) => request.put(`/roles/${id}`, data),
  delete: id => request.delete(`/roles/${id}`)
};

const classes = {
  list: params => request.get('/classes', { params }),
  all: () => request.get('/classes/all'),
  get: id => request.get(`/classes/${id}`),
  create: data => request.post('/classes', data),
  update: (id, data) => request.put(`/classes/${id}`, data),
  delete: id => request.delete(`/classes/${id}`),
  announcements: (id, params) => request.get(`/classes/${id}/announcements`, { params }),
  createAnnouncement: (id, data) => request.post(`/classes/${id}/announcements`, data),
  deleteAnnouncement: (classId, id) => request.delete(`/classes/${classId}/announcements/${id}`),
  honors: id => request.get(`/classes/${id}/honors`),
  createHonor: (id, data) => request.post(`/classes/${id}/honors`, data),
  deleteHonor: (classId, id) => request.delete(`/classes/${classId}/honors/${id}`),
  albums: id => request.get(`/classes/${id}/albums`),
  createAlbum: (id, data) => request.post(`/classes/${id}/albums`, data),
  deleteAlbum: (classId, id) => request.delete(`/classes/${classId}/albums/${id}`)
};

const students = {
  list: params => request.get('/students', { params }),
  get: id => request.get(`/students/${id}`),
  create: data => request.post('/students', data),
  update: (id, data) => request.put(`/students/${id}`, data),
  delete: id => request.delete(`/students/${id}`),
  import: data => request.post('/students/import', data),
  parents: id => request.get(`/students/${id}/parents`),
  createParent: (id, data) => request.post(`/students/${id}/parents`, data),
  deleteParent: (studentId, id) => request.delete(`/students/${studentId}/parents/${id}`)
};

const attendance = {
  list: params => request.get('/attendance', { params }),
  create: data => request.post('/attendance', data),
  batch: data => request.post('/attendance/batch', data),
  statistics: params => request.get('/attendance/statistics', { params }),
  leaveRequests: params => request.get('/attendance/leave-requests', { params }),
  createLeaveRequest: data => request.post('/attendance/leave-requests', data),
  approveLeaveRequest: (id, data) => request.put(`/attendance/leave-requests/${id}`, data)
};

const grades = {
  subjects: () => request.get('/grades/subjects'),
  createSubject: data => request.post('/grades/subjects', data),
  deleteSubject: id => request.delete(`/grades/subjects/${id}`),
  exams: params => request.get('/grades/exams', { params }),
  createExam: data => request.post('/grades/exams', data),
  deleteExam: id => request.delete(`/grades/exams/${id}`),
  list: params => request.get('/grades', { params }),
  create: data => request.post('/grades', data),
  batch: data => request.post('/grades/batch', data),
  calculateRank: examId => request.post(`/grades/calculate-rank/${examId}`),
  statistics: (examId, params) => request.get(`/grades/statistics/${examId}`, { params })
};

const homework = {
  list: params => request.get('/homework', { params }),
  get: id => request.get(`/homework/${id}`),
  create: data => request.post('/homework', data),
  update: (id, data) => request.put(`/homework/${id}`, data),
  delete: id => request.delete(`/homework/${id}`),
  submissions: (id, params) => request.get(`/homework/${id}/submissions`, { params }),
  submit: (id, data) => request.post(`/homework/${id}/submit`, data),
  grade: (id, data) => request.put(`/homework/submissions/${id}/grade`, data),
  unsubmitted: id => request.get(`/homework/${id}/unsubmitted`)
};

const schedule = {
  get: classId => request.get('/schedule', { params: { classId } }),
  create: data => request.post('/schedule', data),
  batch: data => request.post('/schedule/batch', data),
  delete: data => request.delete('/schedule', { data })
};

const rewards = {
  list: params => request.get('/rewards/rewards', { params }),
  create: data => request.post('/rewards/rewards', data),
  delete: id => request.delete(`/rewards/rewards/${id}`),
  evaluations: params => request.get('/rewards/evaluations', { params }),
  getEvaluation: id => request.get(`/rewards/evaluations/${id}`),
  createEvaluation: data => request.post('/rewards/evaluations', data),
  deleteEvaluation: id => request.delete(`/rewards/evaluations/${id}`)
};

const activities = {
  list: params => request.get('/activities', { params }),
  get: id => request.get(`/activities/${id}`),
  create: data => request.post('/activities', data),
  update: (id, data) => request.put(`/activities/${id}`, data),
  delete: id => request.delete(`/activities/${id}`),
  uploadPhoto: (id, data) => request.post(`/activities/${id}/photos`, data),
  deletePhoto: (activityId, id) => request.delete(`/activities/${activityId}/photos/${id}`)
};

const dashboard = {
  overview: () => request.get('/dashboard/overview'),
  attendanceChart: params => request.get('/dashboard/attendance-chart', { params }),
  gradeChart: params => request.get('/dashboard/grade-chart', { params }),
  recentActivities: params => request.get('/dashboard/recent-activities', { params })
};

const logs = {
  list: params => request.get('/logs', { params })
};

const settings = {
  get: () => request.get('/settings'),
  update: data => request.put('/settings', data),
  getByKey: key => request.get(`/settings/${key}`)
};

export default {
  auth,
  users,
  roles,
  classes,
  students,
  attendance,
  grades,
  homework,
  schedule,
  rewards,
  activities,
  dashboard,
  logs,
  settings
};
