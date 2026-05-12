const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/subjects', authMiddleware, (req, res) => {
  const list = db.prepare('SELECT * FROM subjects ORDER BY id').all();
  res.json({ success: true, data: list });
});

router.post('/subjects', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { name, code } = req.body;
  
  const result = db.prepare('INSERT INTO subjects (name, code) VALUES (?, ?)').run(name, code);
  res.json({ success: true, message: '添加成功', data: { id: result.lastInsertRowid } });
});

router.delete('/subjects/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

router.get('/exams', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, classId } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT e.*, c.name as class_name
    FROM exams e
    LEFT JOIN classes c ON e.class_id = c.id
    WHERE 1=1
  `;
  const params = [];
  
  if (classId) {
    sql += ' AND e.class_id = ?';
    params.push(parseInt(classId));
  }
  
  const countSql = sql.replace(/SELECT e\.\*, c\.name as class_name/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY e.exam_date DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/exams', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { name, classId, examDate, totalScore } = req.body;
  
  const result = db.prepare(`
    INSERT INTO exams (name, class_id, exam_date, total_score)
    VALUES (?, ?, ?, ?)
  `).run(name, classId, examDate, totalScore);
  
  logOperation(req.user.id, req.user.username, `创建考试: ${name}`, req);
  res.json({ success: true, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.delete('/exams/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  db.prepare('DELETE FROM grades WHERE exam_id = ?').run(req.params.id);
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: '删除成功' });
});

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, examId, studentId, subjectId } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT g.*, s.name as student_name, s.student_no, sub.name as subject_name, e.name as exam_name
    FROM grades g
    LEFT JOIN students s ON g.student_id = s.id
    LEFT JOIN subjects sub ON g.subject_id = sub.id
    LEFT JOIN exams e ON g.exam_id = e.id
    WHERE 1=1
  `;
  const params = [];
  
  if (examId) {
    sql += ' AND g.exam_id = ?';
    params.push(parseInt(examId));
  }
  if (studentId) {
    sql += ' AND g.student_id = ?';
    params.push(parseInt(studentId));
  }
  if (subjectId) {
    sql += ' AND g.subject_id = ?';
    params.push(parseInt(subjectId));
  }
  
  const countSql = sql.replace(/SELECT g\.\*, s\.name as student_name[\s\S]*?FROM grades/, 'SELECT COUNT(*) as total FROM grades');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY g.score DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { studentId, examId, subjectId, score, comment } = req.body;
  
  const exists = db.prepare('SELECT id FROM grades WHERE student_id = ? AND exam_id = ? AND subject_id = ?')
    .get(studentId, examId, subjectId);
  
  if (exists) {
    db.prepare(`
      UPDATE grades SET score = ?, comment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(score, comment, exists.id);
    return res.json({ success: true, message: '更新成功' });
  }
  
  const result = db.prepare(`
    INSERT INTO grades (student_id, exam_id, subject_id, score, comment)
    VALUES (?, ?, ?, ?, ?)
  `).run(studentId, examId, subjectId, score, comment);
  
  res.json({ success: true, message: '录入成功', data: { id: result.lastInsertRowid } });
});

router.post('/batch', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { examId, subjectId, grades } = req.body;
  
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO grades (student_id, exam_id, subject_id, score, comment)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  grades.forEach(g => {
    insertStmt.run(g.studentId, examId, subjectId, g.score, g.comment);
  });
  
  logOperation(req.user.id, req.user.username, `批量录入成绩`, req);
  res.json({ success: true, message: '批量录入成功' });
});

router.post('/calculate-rank/:examId', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { examId } = req.params;
  
  const grades = db.prepare(`
    SELECT id, student_id, score FROM grades 
    WHERE exam_id = ? 
    ORDER BY score DESC
  `).all(examId);
  
  let rank = 0;
  let prevScore = null;
  let sameRankCount = 0;
  
  grades.forEach((g, index) => {
    if (g.score !== prevScore) {
      rank = index + 1;
      prevScore = g.score;
    }
    db.prepare('UPDATE grades SET rank = ? WHERE id = ?').run(rank, g.id);
  });
  
  res.json({ success: true, message: '排名计算完成' });
});

router.get('/statistics/:examId', authMiddleware, (req, res) => {
  const { examId } = req.params;
  const { subjectId } = req.query;
  
  let sql = `
    SELECT 
      COUNT(*) as total_count,
      AVG(score) as avg_score,
      MAX(score) as max_score,
      MIN(score) as min_score,
      COUNT(CASE WHEN score >= 90 THEN 1 END) as excellent_count,
      COUNT(CASE WHEN score >= 60 AND score < 90 THEN 1 END) as pass_count,
      COUNT(CASE WHEN score < 60 THEN 1 END) as fail_count
    FROM grades
    WHERE exam_id = ?
  `;
  const params = [parseInt(examId)];
  
  if (subjectId) {
    sql += ' AND subject_id = ?';
    params.push(parseInt(subjectId));
  }
  
  const stats = db.prepare(sql).get(...params);
  
  res.json({ success: true, data: stats });
});

module.exports = router;
