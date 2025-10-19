const mysql = require('mysql2/promise');

const connection = mysql.createPool({
    host: 'localhost',
    user: 'winpro',
    password: 'LKT22D23pDkpJAfk',
    database: 'winpro'
});

export default connection;
