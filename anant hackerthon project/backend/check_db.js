const mysql = require('mysql2/promise');

async function checkDb() {
  const passwords = ['', 'root', 'admin', 'password', 'civicpulse'];
  const users = ['root', 'civicpulse'];
  
  for (const u of users) {
    for (const p of passwords) {
      try {
        const conn = await mysql.createConnection({ host: '127.0.0.1', port: 3306, user: u, password: p });
        console.log('SUCCESS with user: ' + u + ' password: ' + p);
        await conn.end();
        return;
      } catch(e) {
        // ignore
      }
    }
  }
  console.log('ALL DB CONNECTION ATTEMPTS FAILED');
}
checkDb();
