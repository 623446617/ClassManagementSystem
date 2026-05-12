const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM settings ORDER BY id').all();
  
  const settings = {};
  list.forEach(s => {
    settings[s.key] = s.value;
  });
  
  res.json({ success: true, data: settings });
});

router.put('/', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const settings = req.body;
  
  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  
  Object.entries(settings).forEach(([key, value]) => {
    updateStmt.run(key, value);
  });
  
  res.json({ success: true, message: '保存成功' });
});

router.get('/:key', authMiddleware, (req, res) => {
  const setting = db.prepare('SELECT * FROM settings WHERE key = ?').get(req.params.key);
  
  if (!setting) {
    return res.status(404).json({ success: false, message: '设置项不存在' });
  }
  
  res.json({ success: true, data: setting });
});

module.exports = router;
