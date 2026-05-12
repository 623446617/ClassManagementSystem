const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/rewards', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, studentId, type } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT rp.*, s.name as student_name, s.student_no, u.real_name as recorder_name
    FROM rewards_punishments rp
    LEFT JOIN students s ON rp.student_id = s.id
    LEFT JOIN users u ON rp.recorder_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (studentId) {
    sql += ' AND rp.student_id = ?';
    params.push(parseInt(studentId));
  }
  if (type) {
    sql += ' AND rp.type = ?';
    params.push(type);
  }
  
  const countSql = sql.replace(/SELECT rp\.\*, s\.name as student_name[\s\S]*?FROM rewards_punishments/, 'SELECT COUNT(*) as total FROM rewards_punishments');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY rp.date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/rewards', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { studentId, type, title, description, date } = req.body;
  
  const result = db.prepare(`
    INSERT INTO rewards_punishments (student_id, type, title, description, date, recorder_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, type, title, description, date, req.user.id);
  
  logOperation(req.user.id, req.user.username, `添加奖惩记录: ${title}`, req);
  res.json({ success: true, message: '添加成功', data: { id: result.lastInsertRowid } });
});

router.delete('/rewards/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM rewards_punishments WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

router.get('/evaluations', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, studentId, semester } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT e.*, s.name as student_name, s.student_no, u.real_name as teacher_name
    FROM evaluations e
    LEFT JOIN students s ON e.student_id = s.id
    LEFT JOIN users u ON e.teacher_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (studentId) {
    sql += ' AND e.student_id = ?';
    params.push(parseInt(studentId));
  }
  if (semester) {
    sql += ' AND e.semester = ?';
    params.push(semester);
  }
  
  const countSql = sql.replace(/SELECT e\.\*, s\.name as student_name[\s\S]*?FROM evaluations/, 'SELECT COUNT(*) as total FROM evaluations');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/evaluations/:id', authMiddleware, (req, res) => {
  const evaluation = db.prepare(`
    SELECT e.*, s.name as student_name, s.student_no
    FROM evaluations e
    LEFT JOIN students s ON e.student_id = s.id
    WHERE e.id = ?
  `).get(req.params.id);
  
  if (!evaluation) {
    return res.status(404).json({ success: false, message: '评价不存在' });
  }
  
  res.json({ success: true, data: evaluation });
});

router.post('/evaluations', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { studentId, semester, moralScore, academicScore, physicalScore, artScore, laborScore, comment } = req.body;
  
  const exists = db.prepare('SELECT id FROM evaluations WHERE student_id = ? AND semester = ?')
    .get(studentId, semester);
  
  if (exists) {
    db.prepare(`
      UPDATE evaluations SET moral_score = ?, academic_score = ?, physical_score = ?, art_score = ?, labor_score = ?, comment = ?, teacher_id = ?
      WHERE id = ?
    `).run(moralScore, academicScore, physicalScore, artScore, laborScore, comment, req.user.id, exists.id);
    return res.json({ success: true, message: '更新成功' });
  }
  
  const result = db.prepare(`
    INSERT INTO evaluations (student_id, semester, moral_score, academic_score, physical_score, art_score, labor_score, comment, teacher_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, semester, moralScore, academicScore, physicalScore, artScore, laborScore, comment, req.user.id);
  
  logOperation(req.user.id, req.user.username, `录入学生评价`, req);
  res.json({ success: true, message: '录入成功', data: { id: result.lastInsertRowid } });
});

router.delete('/evaluations/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM evaluations WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
