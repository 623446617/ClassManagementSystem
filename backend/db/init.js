const db = require('./database');
const bcrypt = require('bcryptjs');

const initDatabase = () => {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  
  if (!adminExists) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    
    db.prepare(`
      INSERT INTO users (username, password, real_name, role, status)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, '系统管理员', 'admin', 1);

    const roles = [
      { name: '管理员', code: 'admin', description: '系统管理员，拥有所有权限', permissions: 'all' },
      { name: '班主任', code: 'teacher', description: '班级管理权限', permissions: 'class,student,attendance,grade,homework,schedule,activity' },
      { name: '学生', code: 'student', description: '学生权限', permissions: 'view_grade,view_homework,submit_homework,view_attendance' },
      { name: '家长', code: 'parent', description: '家长权限', permissions: 'view_grade,view_attendance,view_homework' }
    ];

    const insertRole = db.prepare('INSERT INTO roles (name, code, description, permissions) VALUES (?, ?, ?, ?)');
    roles.forEach(role => insertRole.run(role.name, role.code, role.description, role.permissions));

    const subjects = [
      { name: '语文', code: 'CHINESE' },
      { name: '数学', code: 'MATH' },
      { name: '英语', code: 'ENGLISH' },
      { name: '物理', code: 'PHYSICS' },
      { name: '化学', code: 'CHEMISTRY' },
      { name: '生物', code: 'BIOLOGY' },
      { name: '历史', code: 'HISTORY' },
      { name: '地理', code: 'GEOGRAPHY' },
      { name: '政治', code: 'POLITICS' },
      { name: '体育', code: 'PE' },
      { name: '音乐', code: 'MUSIC' },
      { name: '美术', code: 'ART' }
    ];

    const insertSubject = db.prepare('INSERT INTO subjects (name, code) VALUES (?, ?)');
    subjects.forEach(s => insertSubject.run(s.name, s.code));

    const settings = [
      { key: 'school_name', value: '示例学校', description: '学校名称' },
      { key: 'semester', value: '2024-2025学年第一学期', description: '当前学期' },
      { key: 'max_file_size', value: '10485760', description: '最大文件上传大小(字节)' }
    ];

    const insertSetting = db.prepare('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)');
    settings.forEach(s => insertSetting.run(s.key, s.value, s.description));

    console.log('数据库初始化完成');
  }
};

module.exports = initDatabase;
