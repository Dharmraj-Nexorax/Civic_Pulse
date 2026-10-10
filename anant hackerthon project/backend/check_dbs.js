const mysql = require('mysql2/promise');
async function run() {
  const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'civicpulse', password: 'civicpulse' });
  const [rows] = await conn.query('SHOW DATABASES;');
  console.log(rows);
  await conn.end();
}
run();
