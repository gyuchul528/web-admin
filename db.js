const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'your_username',
  password: 'your_password',
  database: 'your_database',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Database connection successful');
        connection.release();
    } catch (error) {
        console.error('Database connection failed:', error);
        throw error;
    }
}

// 修改 query 方法
const query = async (sql, values) => {
    try {
        const [rows] = await pool.execute(sql, values || []);
        return rows;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// 立即测试连接
testConnection().catch(console.error);

module.exports = {
    query,
    testConnection
}; 