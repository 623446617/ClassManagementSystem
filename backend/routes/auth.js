const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authMiddleware } = require('../middleware/auth');
const { logOperation } = require('../utils/logger');
const initDatabase = require('../db/init');

initDatabase();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }
  
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  
  if (!user) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
  
  if (user.status !== 1) {
    return res.status(403).json({ success: false, message: '账号已被禁用' });
  }
  
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
  
  const token = generateToken(user.id);
  
  logOperation(user.id, user.username, '用户登录', req);
  
  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        role: user.role,
        avatar: user.avatar
      }
    }
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  logOperation(req.user.id, req.user.username, '用户退出', req);
  res.json({ success: true, message: '退出成功' });
});

router.get('/profile', authMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT u.id, u.username, u.real_name, u.role, u.phone, u.email, u.avatar, u.created_at,
           s.student_no, s.class_id, c.name as class_name
    FROM users u
    LEFT JOIN students s ON u.id = s.user_id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE u.id = ?
  `).get(req.user.id);
  
  res.json({ success: true, data: user });
});

router.put('/profile', authMiddleware, (req, res) => {
  const { realName, phone, email } = req.body;
  
  db.prepare(`
    UPDATE users SET real_name = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(realName, phone, email, req.user.id);
  
  logOperation(req.user.id, req.user.username, '修改个人信息', req);
  res.json({ success: true, message: '修改成功' });
});

router.put('/password', authMiddleware, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  
  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.status(400).json({ success: false, message: '原密码错误' });
  }
  
  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(hashedPassword, req.user.id);
  
  logOperation(req.user.id, req.user.username, '修改密码', req);
  res.json({ success: true, message: '密码修改成功' });
});

module.exports = router;
