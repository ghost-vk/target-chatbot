const { DB_USER, DB_NAME, DB_PASSWORD } = require('./config')
const Pool = require('pg').Pool

const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: 'localhost',
  port: 5432,
  database: DB_NAME,
})

module.exports = pool
