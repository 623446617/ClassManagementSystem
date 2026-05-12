const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');
const upload = require('../utils/upload');

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, classId } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT a.*, c.name as class_name, u.real_name as organizer_name
    FROM activities a
    LEFT JOIN classes c ON a.class_id = c.id
    LEFT JOIN users u ON a.organizer_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (classId) {
    sql += ' AND a.class_id = ?';
    params.push(parseInt(classId));
  }
  
  const countSql = sql.replace(/SELECT a\.\*, c\.name as class_name, u\.real_name as organizer_name/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY a.activity_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', authMiddleware, (req, res) => {
  const activity = db.prepare(`
    SELECT a.*, c.name as class_name, u.real_name as organizer_name
    FROM activities a
    LEFT JOIN classes c ON a.class_id = c.id
    LEFT JOIN users u ON a.organizer_id = u.id
    WHERE a.id = ?
  `).get(req.params.id);
  
  if (!activity) {
    return res.status(404).json({ success: false, message: '活动不存在' });
  }
  
  const photos = db.prepare('SELECT * FROM activity_photos WHERE activity_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  activity.photos = photos;
  
  res.json({ success: true, data: activity });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { classId, title, description, activityDate, location } = req.body;
  
  const result = db.prepare(`
    INSERT INTO activities (class_id, title, description, activity_date, location, organizer_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(classId, title, description, activityDate, location, req.user.id);
  
  logOperation(req.user.id, req.user.username, `发布活动: ${title}`, req);
  res.json({ success: true, message: '发布成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { title, description, activityDate, location } = req.body;
  
  db.prepare(`
    UPDATE activities SET title = ?, description = ?, activity_date = ?, location = ?
    WHERE id = ?
  `).run(title, description, activityDate, location, req.params.id);
  
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM activity_photos WHERE activity_id = ?').run(req.params.id);
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

router.post('/:id/photos', authMiddleware, roleMiddleware('admin', 'teacher'), upload.single('photo'), (req, res) => {
  const { description } = req.body;
  const imagePath = req.file ? req.file.path.replace(/\\/g, '/') : null;
  
  if (!imagePath) {
    return res.status(400).json({ success: false, message: '请上传图片' });
  }
  
  const result = db.prepare(`
    INSERT INTO activity_photos (activity_id, image_path, description)
    VALUES (?, ?, ?)
  `).run(req.params.id, imagePath, description);
  
  res.json({ success: true, message: '上传成功', data: { id: result.lastInsertRowid, imagePath } });
});

router.delete('/:activityId/photos/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM activity_photos WHERE id = ? AND activity_id = ?')
    .run(req.params.id, req.params.activityId);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
