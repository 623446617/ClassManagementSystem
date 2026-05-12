const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM roles ORDER BY id').all();
  res.json({ success: true, data: list });
});

router.post('/', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { name, code, description, permissions } = req.body;
  
  const exists = db.prepare('SELECT id FROM roles WHERE code = ?').get(code);
  if (exists) {
    return res.status(400).json({ success: false, message: '角色编码已存在' });
  }
  
  const result = db.prepare('INSERT INTO roles (name, code, description, permissions) VALUES (?, ?, ?, ?)')
    .run(name, code, description, permissions);
  
  res.json({ success: true, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { name, description, permissions } = req.body;
  
  db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?')
    .run(name, description, permissions, req.params.id);
  
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  db.prepare('DELETE FROM roles WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
