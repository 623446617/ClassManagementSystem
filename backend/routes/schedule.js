const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/', authMiddleware, (req, res) => {
  const { classId } = req.query;
  
  if (!classId) {
    return res.status(400).json({ success: false, message: '班级ID不能为空' });
  }
  
  const list = db.prepare(`
    SELECT s.*, sub.name as subject_name, u.real_name as teacher_name
    FROM schedules s
    LEFT JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN users u ON s.teacher_id = u.id
    WHERE s.class_id = ?
    ORDER BY s.day_of_week, s.period
  `).all(parseInt(classId));
  
  const schedule = {};
  for (let i = 1; i <= 7; i++) {
    schedule[i] = {};
    for (let j = 1; j <= 8; j++) {
      schedule[i][j] = null;
    }
  }
  
  list.forEach(item => {
    schedule[item.day_of_week][item.period] = item;
  });
  
  res.json({ success: true, data: schedule });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { classId, dayOfWeek, period, subjectId, teacherId, classroom } = req.body;
  
  const exists = db.prepare('SELECT id FROM schedules WHERE class_id = ? AND day_of_week = ? AND period = ?')
    .get(classId, dayOfWeek, period);
  
  if (exists) {
    db.prepare(`
      UPDATE schedules SET subject_id = ?, teacher_id = ?, classroom = ?
      WHERE id = ?
    `).run(subjectId, teacherId, classroom, exists.id);
    return res.json({ success: true, message: '更新成功' });
  }
  
  const result = db.prepare(`
    INSERT INTO schedules (class_id, day_of_week, period, subject_id, teacher_id, classroom)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(classId, dayOfWeek, period, subjectId, teacherId, classroom);
  
  logOperation(req.user.id, req.user.username, `设置课程表`, req);
  res.json({ success: true, message: '设置成功', data: { id: result.lastInsertRowid } });
});

router.post('/batch', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { classId, schedules } = req.body;
  
  db.prepare('DELETE FROM schedules WHERE class_id = ?').run(classId);
  
  const insertStmt = db.prepare(`
    INSERT INTO schedules (class_id, day_of_week, period, subject_id, teacher_id, classroom)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  schedules.forEach(s => {
    if (s.subjectId) {
      insertStmt.run(classId, s.dayOfWeek, s.period, s.subjectId, s.teacherId, s.classroom);
    }
  });
  
  logOperation(req.user.id, req.user.username, `批量设置课程表`, req);
  res.json({ success: true, message: '批量设置成功' });
});

router.delete('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { classId, dayOfWeek, period } = req.body;
  
  db.prepare('DELETE FROM schedules WHERE class_id = ? AND day_of_week = ? AND period = ?')
    .run(classId, dayOfWeek, period);
  
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
