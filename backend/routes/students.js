const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');

router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, keyword, classId, status } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT s.*, c.name as class_name, c.grade,
           (SELECT COUNT(*) FROM parents WHERE student_id = s.id) as parent_count
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const params = [];
  
  if (keyword) {
    sql += ' AND (s.name LIKE ? OR s.student_no LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (classId) {
    sql += ' AND s.class_id = ?';
    params.push(parseInt(classId));
  }
  if (status) {
    sql += ' AND s.status = ?';
    params.push(status);
  }
  
  const countSql = sql.replace(/SELECT s\.\*, c\.name as class_name, c\.grade,\s*\(SELECT COUNT\(\*\) FROM parents WHERE student_id = s\.id\) as parent_count/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', authMiddleware, (req, res) => {
  const student = db.prepare(`
    SELECT s.*, c.name as class_name, c.grade
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(req.params.id);
  
  if (!student) {
    return res.status(404).json({ success: false, message: '学生不存在' });
  }
  
  const parents = db.prepare('SELECT * FROM parents WHERE student_id = ?').all(req.params.id);
  student.parents = parents;
  
  res.json({ success: true, data: student });
});

router.post('/', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { studentNo, name, gender, birthDate, address, classId, enrollmentDate, phone, email } = req.body;
  
  const exists = db.prepare('SELECT id FROM students WHERE student_no = ?').get(studentNo);
  if (exists) {
    return res.status(400).json({ success: false, message: '学号已存在' });
  }
  
  const result = db.prepare(`
    INSERT INTO students (student_no, name, gender, birth_date, address, class_id, enrollment_date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(studentNo, name, gender, birthDate, address, classId, enrollmentDate);
  
  if (phone || email) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(studentNo, 10);
    db.prepare(`
      INSERT INTO users (username, password, real_name, role, phone, email)
      VALUES (?, ?, ?, 'student', ?, ?)
    `).run(studentNo, hashedPassword, name, phone, email);
    
    const userId = db.prepare('SELECT id FROM users WHERE username = ?').get(studentNo).id;
    db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(userId, result.lastInsertRowid);
  }
  
  logOperation(req.user.id, req.user.username, `添加学生: ${name}`, req);
  res.json({ success: true, message: '添加成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { name, gender, birthDate, address, classId, status, phone, email } = req.body;
  
  db.prepare(`
    UPDATE students SET name = ?, gender = ?, birth_date = ?, address = ?, class_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, gender, birthDate, address, classId, status, req.params.id);
  
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (student.user_id) {
    db.prepare('UPDATE users SET real_name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name, phone, email, student.user_id);
  }
  
  logOperation(req.user.id, req.user.username, `更新学生ID: ${req.params.id}`, req);
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  
  if (student.user_id) {
    db.prepare('DELETE FROM users WHERE id = ?').run(student.user_id);
  }
  
  db.prepare('DELETE FROM parents WHERE student_id = ?').run(req.params.id);
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  
  logOperation(req.user.id, req.user.username, `删除学生ID: ${req.params.id}`, req);
  res.json({ success: true, message: '删除成功' });
});

router.post('/import', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { students } = req.body;
  const results = { success: 0, failed: 0, errors: [] };
  
  const bcrypt = require('bcryptjs');
  
  students.forEach((s, index) => {
    try {
      const exists = db.prepare('SELECT id FROM students WHERE student_no = ?').get(s.studentNo);
      if (exists) {
        results.failed++;
        results.errors.push(`第${index + 1}行: 学号已存在`);
        return;
      }
      
      const result = db.prepare(`
        INSERT INTO students (student_no, name, gender, birth_date, address, class_id, enrollment_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(s.studentNo, s.name, s.gender, s.birthDate, s.address, s.classId, s.enrollmentDate);
      
      if (s.phone || s.email) {
        const hashedPassword = bcrypt.hashSync(s.studentNo, 10);
        db.prepare(`
          INSERT INTO users (username, password, real_name, role, phone, email)
          VALUES (?, ?, ?, 'student', ?, ?)
        `).run(s.studentNo, hashedPassword, s.name, s.phone, s.email);
        
        const userId = db.prepare('SELECT id FROM users WHERE username = ?').get(s.studentNo).id;
        db.prepare('UPDATE students SET user_id = ? WHERE id = ?').run(userId, result.lastInsertRowid);
      }
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`第${index + 1}行: ${error.message}`);
    }
  });
  
  logOperation(req.user.id, req.user.username, `批量导入学生: 成功${results.success}条`, req);
  res.json({ success: true, data: results });
});

router.get('/:id/parents', authMiddleware, (req, res) => {
  const parents = db.prepare('SELECT * FROM parents WHERE student_id = ?').all(req.params.id);
  res.json({ success: true, data: parents });
});

router.post('/:id/parents', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  const { name, relationship, phone, email } = req.body;
  
  const result = db.prepare(`
    INSERT INTO parents (student_id, name, relationship, phone, email)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.params.id, name, relationship, phone, email);
  
  res.json({ success: true, message: '添加成功', data: { id: result.lastInsertRowid } });
});

router.delete('/:studentId/parents/:id', authMiddleware, roleMiddleware('admin', 'teacher'), (req, res) => {
  db.prepare('DELETE FROM parents WHERE id = ? AND student_id = ?')
    .run(req.params.id, req.params.studentId);
  res.json({ success: true, message: '删除成功' });
});

module.exports = router;
