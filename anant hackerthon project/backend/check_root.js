const mysql = require('mysql2/promise');

async function checkDb() {
  const passwords = ['root', '1234', '12345', '123456', '12345678', 'password', 'toor', 'admin', 'admin123', 'civicpulse', 'mysql'];
  
  for (const p of passwords) {
    try {
      const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: 'root', password: p });
      console.log('SUCCESS with root / ' + p);
      await conn.end();
      return;
    } catch(e) {
      // ignore
    }
  }
  console.log('ALL FAILED');
}
checkDb();
