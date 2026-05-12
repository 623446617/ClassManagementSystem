const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');
const upload = require('../utils/upload');

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, classId, subjectId } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT h.*, c.name as class_name, sub.name as subject_name, u.real_name as publisher_name
    FROM homework h
    LEFT JOIN classes c ON h.class_id = c.id
    LEFT JOIN subjects sub ON h.subject_id = sub.id
    LEFT JOIN users u ON h.publisher_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (classId) {
    sql += ' AND h.class_id = ?';
    params.push(parseInt(classId));
  }
  if (subjectId) {
    sql += ' AND h.subject_id = ?';
    params.push(parseInt(subjectId));
  }
  
  const countSql = sql.replace(/SELECT h\.\*, c\.name as class_name[\s\S]*?FROM homework/, 'SELECT COUNT(*) as total FROM homework');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY h.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', authMiddleware, (req, res) => {
  const homework = db.prepare(`
    SELECT h.*, c.name as class_name, sub.name as subject_name, u.real_name as publisher_name
    FROM homework h
    LEFT JOIN classes c ON h.class_id = c.id
    LEFT JOIN subjects sub ON h.subject_id = sub.id
    LEFT JOIN users u ON h.publisher_id = u.id
    WHERE h.id = ?
  `).get(req.params.id);
  
  if (!homework) {
    return res.status(404).json({ success: false, message: '作业不存在' });
  }
  
  res.json({ success: true, data: homework });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), upload.single('attachment'), (req, res) => {
  const { classId, subjectId, title, content, deadline } = req.body;
  const attachment = req.file ? req.file.path.replace(/\\/g, '/') : null;
  
  const result = db.prepare(`
    INSERT INTO homework (class_id, subject_id, title, content, attachment, deadline, publisher_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(classId, subjectId, title, content, attachment, deadline, req.user.id);
  
  logOperation(req.user.id, req.user.username, `发布作业: ${title}`, req);
  res.json({ success: true, message: '发布成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, roleMiddleware('admin', 'teacher'), upload.single('attachment'), (req, res) => {
  const { title, content, deadline } = req.body;
  const attachment = req.file ? req.file.path.replace(/\\/g, '/') : null;
  
  if (attachment) {
    db.prepare(`
      UPDATE homework SET title = ?, content = ?, attachment = ?, deadline = ?
      WHERE id = ?
    `).run(title, content, attachment, deadline, req.params.id);
  } else {
    db.prepare(`
      UPDATE homework SET title = ?, content = ?, deadline = ?
      WHERE id = ?
    `).run(title, content, deadline, req.params.id);
  }
  
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM homework_submissions WHERE homework_id = ?').run(req.params.id);
  db.prepare('DELETE FROM homework WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

router.get('/:id/submissions', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, status } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT hs.*, s.name as student_name, s.student_no
    FROM homework_submissions hs
    LEFT JOIN students s ON hs.student_id = s.id
    WHERE hs.homework_id = ?
  `;
  const params = [parseInt(req.params.id)];
  
  if (status) {
    sql += ' AND hs.status = ?';
    params.push(status);
  }
  
  const countSql = sql.replace(/SELECT hs\.\*, s\.name as student_name, s\.student_no/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY hs.submit_time DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/:id/submit', authMiddleware, upload.single('attachment'), (req, res) => {
  const { content } = req.body;
  const attachment = req.file ? req.file.path.replace(/\\/g, '/') : null;
  
  const student = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
  if (!student) {
    return res.status(400).json({ success: false, message: '非学生账号无法提交作业' });
  }
  
  const exists = db.prepare('SELECT id FROM homework_submissions WHERE homework_id = ? AND student_id = ?')
    .get(req.params.id, student.id);
  
  if (exists) {
    db.prepare(`
      UPDATE homework_submissions SET content = ?, attachment = ?, submit_time = CURRENT_TIMESTAMP, status = '已提交'
      WHERE id = ?
    `).run(content, attachment, exists.id);
    return res.json({ success: true, message: '更新成功' });
  }
  
  const result = db.prepare(`
    INSERT INTO homework_submissions (homework_id, student_id, content, attachment, submit_time, status)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, '已提交')
  `).run(req.params.id, student.id, content, attachment);
  
  res.json({ success: true, message: '提交成功', data: { id: result.lastInsertRowid } });
});

router.put('/submissions/:id/grade', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { score, comment } = req.body;
  
  db.prepare(`
    UPDATE homework_submissions SET score = ?, comment = ?, grade_time = CURRENT_TIMESTAMP, status = '已批改'
    WHERE id = ?
  `).run(score, comment, req.params.id);
  
  logOperation(req.user.id, req.user.username, `批改作业提交ID: ${req.params.id}`, req);
  res.json({ success: true, message: '批改成功' });
});

router.get('/:id/unsubmitted', authMiddleware, (req, res) => {
  const homework = db.prepare('SELECT class_id FROM homework WHERE id = ?').get(req.params.id);
  if (!homework) {
    return res.status(404).json({ success: false, message: '作业不存在' });
  }
  
  const list = db.prepare(`
    SELECT s.id, s.name, s.student_no
    FROM students s
    WHERE s.class_id = ? AND s.status = '在校'
    AND s.id NOT IN (
      SELECT student_id FROM homework_submissions WHERE homework_id = ?
    )
  `).all(homework.class_id, req.params.id);
  
  res.json({ success: true, data: list });
});

module.exports = router;
