const mysql = require('mysql2');

// MySQL connection setup
const conn = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '',
  database: 'realestate'
});

conn.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    return;
  }
  console.log('Connected to MySQL database');
});

module.exports = conn;
