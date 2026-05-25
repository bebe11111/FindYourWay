const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT, // <-- EZ HIÁNYZOTT: Beolvassuk az 5 jegyű portot
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false // <-- EZ HIÁNYZOTT: Bekapcsoljuk az SSL-t az Aivenhez
    }
});

module.exports = pool;