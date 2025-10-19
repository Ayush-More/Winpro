const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'localhost',
    user: 'dubaideck',
    password: 'xGHCxY4Lm8XSESdA',
    database: 'dubaideck'
});

export default connection;