const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { page = 1, pageSize = 10, keyword, role, status } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = 'SELECT id, username, real_name, role, phone, email, avatar, status, created_at FROM users WHERE 1=1';
  const params = [];
  
  if (keyword) {
    sql += ' AND (username LIKE ? OR real_name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (status !== undefined && status !== '') {
    sql += ' AND status = ?';
    params.push(parseInt(status));
  }
  
  const countSql = sql.replace('SELECT id, username, real_name, role, phone, email, avatar, status, created_at', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.role, u.phone, u.email, u.avatar, u.status, u.created_at,
           s.student_no, s.class_id, c.name as class_name
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE u.id = ?
  `).get(req.params.id);
  
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  res.json({ success: true, data: user });
});

router.post('/', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { username, password, realName, role, phone, email } = req.body;
  
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(400).json({ success: false, message: '用户名已存在' });
  }
  
  const hashedPassword = bcrypt.hashSync(password || '123456', 10);
  
  const result = db.prepare(`
    INSERT INTO users (username, password, real_name, role, phone, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, hashedPassword, realName, role, phone, email);
  
  logOperation(req.user.id, req.user.username, `创建用户: ${username}`, req);
  res.json({ success: true, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { realName, role, phone, email, status } = req.body;
  
  db.prepare(`
    UPDATE users SET real_name = ?, role = ?, phone = ?, email = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(realName, role, phone, email, status, req.params.id);
  
  logOperation(req.user.id, req.user.username, `更新用户ID: ${req.params.id}`, req);
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ success: false, message: '不能删除自己' });
  }
  
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM students WHERE user_id = ?').run(req.params.id);
  
  logOperation(req.user.id, req.user.username, `删除用户ID: ${req.params.id}`, req);
  res.json({ success: true, message: '删除成功' });
});

router.put('/:id/reset-password', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const hashedPassword = bcrypt.hashSync('123456', 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hashedPassword, req.params.id);
  
  logOperation(req.user.id, req.user.username, `重置用户密码ID: ${req.params.id}`, req);
  res.json({ success: true, message: '密码已重置为123456' });
});

module.exports = router;
