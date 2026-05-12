const db = require('../db/database');

const logOperation = (userId, username, operation, req) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    db.prepare(`
      INSERT INTO operation_logs (user_id, username, operation, ip, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, username, operation, ip, userAgent);
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
};

module.exports = { logOperation };
