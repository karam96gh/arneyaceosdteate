const mysql = require('mysql2');

// MySQL connection setup
const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'realestate',
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

conn.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('Connected to MySQL database');
  setInterval(() => {
    connection.query('SELECT 1', (err) => {
      if (err) console.error('Keep-Alive query failed:', err);
      console.log('hiii');
    });
  }, 5000);
});


module.exports = conn;
