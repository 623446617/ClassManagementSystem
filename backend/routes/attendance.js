const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, classId, date, status } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT a.*, s.name as student_name, s.student_no, c.name as class_name
    FROM attendance a
    LEFT JOIN students s ON a.student_id = s.id
    LEFT JOIN classes c ON a.class_id = c.id
    WHERE 1=1
  `;
  const params = [];
  
  if (classId) {
    sql += ' AND a.class_id = ?';
    params.push(parseInt(classId));
  }
  if (date) {
    sql += ' AND a.date = ?';
    params.push(date);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  
  const countSql = sql.replace(/SELECT a\.\*, s\.name as student_name, s\.student_no, c\.name as class_name/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY a.date DESC, a.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { studentId, classId, date, status, reason } = req.body;
  
  const exists = db.prepare('SELECT id FROM attendance WHERE student_id = ? AND date = ?').get(studentId, date);
  if (exists) {
    db.prepare(`
      UPDATE attendance SET status = ?, reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE student_id = ? AND date = ?
    `).run(status, reason, studentId, date);
    return res.json({ success: true, message: '更新成功' });
  }
  
  const result = db.prepare(`
    INSERT INTO attendance (student_id, class_id, date, status, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(studentId, classId, date, status, reason);
  
  logOperation(req.user.id, req.user.username, `登记考勤: ${date}`, req);
  res.json({ success: true, message: '登记成功', data: { id: result.lastInsertRowid } });
});

router.post('/batch', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { classId, date, records } = req.body;
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO attendance (student_id, class_id, date, status, reason)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  records.forEach(r => {
    insertStmt.run(r.studentId, classId, date, r.status, r.reason);
  });
  
  logOperation(req.user.id, req.user.username, `批量登记考勤: ${date}`, req);
  res.json({ success: true, message: '批量登记成功' });
});

router.get('/statistics', authMiddleware, (req, res) => {
  const { classId, month } = req.query;
  
  let sql = `
    SELECT 
      COUNT(CASE WHEN status = '正常' THEN 1 END) as normal_count,
      COUNT(CASE WHEN status = '迟到' THEN 1 END) as late_count,
      COUNT(CASE WHEN status = '旷课' THEN 1 END) as absent_count,
      COUNT(CASE WHEN status = '请假' THEN 1 END) as leave_count
    FROM attendance
    WHERE 1=1
  `;
  const params = [];
  
  if (classId) {
    sql += ' AND class_id = ?';
    params.push(parseInt(classId));
  }
  if (month) {
    sql += ' AND strftime("%Y-%m", date) = ?';
    params.push(month);
  }
  
  const stats = db.prepare(sql).get(...params);
  
  res.json({ success: true, data: stats });
});

router.get('/leave-requests', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, classId, status } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT lr.*, s.name as student_name, s.student_no, c.name as class_name,
           u.real_name as approver_name
    FROM leave_requests lr
    LEFT JOIN students s ON lr.student_id = s.id
    LEFT JOIN classes c ON lr.class_id = c.id
    LEFT JOIN users u ON lr.approver_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (classId) {
    sql += ' AND lr.class_id = ?';
    params.push(parseInt(classId));
  }
  if (status) {
    sql += ' AND lr.status = ?';
    params.push(status);
  }
  
  const countSql = sql.replace(/SELECT lr\.\*, s\.name as student_name[\s\S]*?FROM leave_requests/, 'SELECT COUNT(*) as total FROM leave_requests');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY lr.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/leave-requests', authMiddleware, (req, res) => {
  const { studentId, classId, startDate, endDate, reason } = req.body;
  
  const result = db.prepare(`
    INSERT INTO leave_requests (student_id, class_id, start_date, end_date, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(studentId, classId, startDate, endDate, reason);
  
  res.json({ success: true, message: '请假申请已提交', data: { id: result.lastInsertRowid } });
});

router.put('/leave-requests/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { status } = req.body;
  
  db.prepare(`
    UPDATE leave_requests SET status = ?, approver_id = ?, approve_time = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, req.user.id, req.params.id);
  
  logOperation(req.user.id, req.user.username, `审批请假ID: ${req.params.id}`, req);
  res.json({ success: true, message: '审批完成' });
});

module.exports = router;
