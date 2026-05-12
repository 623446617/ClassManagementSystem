const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, roleMiddleware('admin'), (req, res) => {
  const { page = 1, pageSize = 20, userId, startDate, endDate } = req.query;
  const offset = (page - 1) * pageSize;
  
  let sql = `
    SELECT ol.*, u.real_name
    FROM operation_logs ol
    LEFT JOIN users u ON ol.user_id = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (userId) {
    sql += ' AND ol.user_id = ?';
    params.push(parseInt(userId));
  }
  if (startDate) {
    sql += ' AND date(ol.created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date(ol.created_at) <= ?';
    params.push(endDate);
  }
  
  const countSql = sql.replace(/SELECT ol\.\*, u\.real_name/, 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params).total;
  
  sql += ' ORDER BY ol.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);
  
  const list = db.prepare(sql).all(...params);
  
  res.json({ success: true, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

module.exports = router;
