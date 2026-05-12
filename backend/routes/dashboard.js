const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware } = require('../middleware/auth');

router.get('/overview', authMiddleware, (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id;
  
  let classFilter = '';
  let params = [];
  
  if (userRole === 'teacher') {
    classFilter = 'AND c.teacher_id = ?';
    params.push(userId);
  } else if (userRole === 'student') {
    classFilter = 'AND s.user_id = ?';
    params.push(userId);
  }
  
  const studentCount = db.prepare(`
    SELECT COUNT(*) as count FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.status = '在校' ${classFilter}
  `).get(...params).count;
  
  const classCount = db.prepare(`
    SELECT COUNT(*) as count FROM classes c WHERE c.status = 1
    ${userRole === 'teacher' ? 'AND c.teacher_id = ?' : ''}
  `).get(...(userRole === 'teacher' ? [userId] : [])).count;
  
  const todayAttendance = db.prepare(`
    SELECT 
      COUNT(CASE WHEN a.status = '正常' THEN 1 END) as normal,
      COUNT(CASE WHEN a.status = '迟到' THEN 1 END) as late,
      COUNT(CASE WHEN a.status = '旷课' THEN 1 END) as absent,
      COUNT(CASE WHEN a.status = '请假' THEN 1 END) as leave_count
    FROM attendance a
    LEFT JOIN classes c ON a.class_id = c.id
    WHERE a.date = date('now')
    ${userRole === 'teacher' ? 'AND c.teacher_id = ?' : ''}
  `).get(...(userRole === 'teacher' ? [userId] : []));
  
  const pendingLeave = db.prepare(`
    SELECT COUNT(*) as count FROM leave_requests lr
    LEFT JOIN classes c ON lr.class_id = c.id
    WHERE lr.status = '待审批'
    ${userRole === 'teacher' ? 'AND c.teacher_id = ?' : ''}
  `).get(...(userRole === 'teacher' ? [userId] : [])).count;
  
  const pendingHomework = db.prepare(`
    SELECT COUNT(*) as count FROM homework h
    LEFT JOIN classes c ON h.class_id = c.id
    WHERE h.deadline > datetime('now')
    ${userRole === 'teacher' ? 'AND c.teacher_id = ?' : ''}
  `).get(...(userRole === 'teacher' ? [userId] : [])).count;
  
  res.json({
    success: true,
    data: {
      studentCount,
      classCount,
      todayAttendance,
      pendingLeave,
      pendingHomework
    }
  });
});

router.get('/attendance-chart', authMiddleware, (req, res) => {
  const { classId, month } = req.query;
  
  let sql = `
    SELECT date, 
           COUNT(CASE WHEN status = '正常' THEN 1 END) as normal,
           COUNT(CASE WHEN status = '迟到' THEN 1 END) as late,
           COUNT(CASE WHEN status = '旷课' THEN 1 END) as absent,
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
  
  sql += ' GROUP BY date ORDER BY date LIMIT 30';
  
  const data = db.prepare(sql).all(...params);
  
  res.json({ success: true, data });
});

router.get('/grade-chart', authMiddleware, (req, res) => {
  const { examId, classId } = req.query;
  
  let sql = `
    SELECT 
      sub.name as subject_name,
      AVG(g.score) as avg_score,
      MAX(g.score) as max_score,
      MIN(g.score) as min_score
    FROM grades g
    LEFT JOIN subjects sub ON g.subject_id = sub.id
    LEFT JOIN students s ON g.student_id = s.id
    WHERE 1=1
  `;
  const params = [];
  
  if (examId) {
    sql += ' AND g.exam_id = ?';
    params.push(parseInt(examId));
  }
  if (classId) {
    sql += ' AND s.class_id = ?';
    params.push(parseInt(classId));
  }
  
  sql += ' GROUP BY g.subject_id ORDER BY sub.id';
  
  const data = db.prepare(sql).all(...params);
  
  res.json({ success: true, data });
});

router.get('/recent-activities', authMiddleware, (req, res) => {
  const { limit = 10 } = req.query;
  
  const announcements = db.prepare(`
    SELECT 'announcement' as type, ca.title, ca.created_at, c.name as class_name
    FROM class_announcements ca
    LEFT JOIN classes c ON ca.class_id = c.id
    ORDER BY ca.created_at DESC
    LIMIT ?
  `).all(parseInt(limit));
  
  const activities = db.prepare(`
    SELECT 'activity' as type, a.title, a.activity_date as created_at, c.name as class_name
    FROM activities a
    LEFT JOIN classes c ON a.class_id = c.id
    ORDER BY a.activity_date DESC
    LIMIT ?
  `).all(parseInt(limit));
  
  const homework = db.prepare(`
    SELECT 'homework' as type, h.title, h.created_at, c.name as class_name
    FROM homework h
    LEFT JOIN classes c ON h.class_id = c.id
    ORDER BY h.created_at DESC
    LIMIT ?
  `).all(parseInt(limit));
  
  const all = [...announcements, ...activities, ...homework]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, parseInt(limit));
  
  res.json({ success: true, data: all });
});

module.exports = router;
