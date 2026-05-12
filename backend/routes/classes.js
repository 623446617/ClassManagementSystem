const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, keyword, grade } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT c.*, u.real_name as teacher_name,
           (SELECT COUNT(*) FROM students WHERE class_id = c.id) as student_count
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.status = 1
  `;
  const params = [];
  
  if (keyword) {
    sql += ' AND c.name LIKE ?';
    params.push(`%${keyword}%`);
  }
  if (grade) {
    sql += ' AND c.grade = ?';
    params.push(grade);
  }
  
  const countSql = sql.replace(/SELECT c\.\*, u\.real_name as teacher_name,\s*\(SELECT COUNT\(\*\) FROM students WHERE class_id = c\.id\) as student_count/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/all', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT id, name, grade FROM classes WHERE status = 1 ORDER BY grade, name').all();
  res.json({ success: true, data: list });
});

router.get('/:id', authMiddleware, (req, res) => {
  const classInfo = db.prepare(`
    SELECT c.*, u.real_name as teacher_name
    FROM classes c
    LEFT JOIN users u ON c.teacher_id = u.id
    WHERE c.id = ?
  `).get(req.params.id);
  
  if (!classInfo) {
    return res.status(404).json({ success: false, message: '班级不存在' });
  }
  
  res.json({ success: true, data: classInfo });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { name, grade, teacherId, description } = req.body;
  
  const result = db.prepare(`
    INSERT INTO classes (name, grade, teacher_id, description)
    VALUES (?, ?, ?, ?)
  `).run(name, grade, teacherId, description);
  
  logOperation(req.user.id, req.user.username, `创建班级: ${name}`, req);
  res.json({ success: true, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { name, grade, teacherId, description, status } = req.body;
  
  db.prepare(`
    UPDATE classes SET name = ?, grade = ?, teacher_id = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, grade, teacherId, description, status, req.params.id);
  
  logOperation(req.user.id, req.user.username, `更新班级ID: ${req.params.id}`, req);
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  db.prepare('UPDATE classes SET status = 0 WHERE id = ?').run(req.params.id);
  logOperation(req.user.id, req.user.username, `删除班级ID: ${req.params.id}`, req);
  res.json({ success: true, message: '删除成功' });
});

router.get('/:id/announcements', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;
  
  const total = db.prepare('SELECT COUNT(*) as total FROM class_announcements WHERE class_id = ?')
    .get(req.params.id).total;
  
  const list = db.prepare(`
    SELECT ca.*, u.real_name as publisher_name
    FROM class_announcements ca
    LEFT JOIN users u ON ca.publisher_id = u.id
    WHERE ca.class_id = ?
    ORDER BY ca.created_at DESC
    LIMIT ? OFFSET ?
  `).all(req.params.id, parseInt(pageSize), offset);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/:id/announcements', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { title, content } = req.body;
  
  const result = db.prepare(`
    INSERT INTO class_announcements (class_id, title, content, publisher_id)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, title, content, req.user.id);
  
  logOperation(req.user.id, req.user.username, `发布公告: ${title}`, req);
  res.json({ success: true, message: '发布成功', data: { id: result.lastInsertRowid } });
});

router.delete('/:classId/announcements/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM class_announcements WHERE id = ? AND class_id = ?')
    .run(req.params.id, req.params.classId);
  res.json({ success: true, message: '删除成功' });
});

router.get('/:id/honors', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM class_honors WHERE class_id = ? ORDER BY award_date DESC')
    .all(req.params.id);
  res.json({ success: true, data: list });
});

router.post('/:id/honors', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { title, description, awardDate } = req.body;
  
  const result = db.prepare(`
    INSERT INTO class_honors (class_id, title, description, award_date)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, title, description, awardDate);
  
  res.json({ success: true, message: '添加成功', data: { id: result.lastInsertRowid } });
});

router.delete('/:classId/honors/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM class_honors WHERE id = ? AND class_id = ?')
    .run(req.params.id, req.params.classId);
  res.json({ success: true, message: '删除成功' });
});

router.get('/:id/albums', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM class_albums WHERE class_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json({ success: true, data: list });
});

router.post('/:id/albums', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { title, description, imagePath } = req.body;
  
  const result = db.prepare(`
    INSERT INTO class_albums (class_id, title, description, image_path)
    VALUES (?, ?, ?, ?)
  `).run(req.params.id, title, description, imagePath);
  
  res.json({ success: true, message: '添加成功', data: { id: result.lastInsertRowid } });
});

router.delete('/:classId/albums/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM class_albums WHERE id = ? AND class_id = ?')
    .run(req.params.id, req.params.classId);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
