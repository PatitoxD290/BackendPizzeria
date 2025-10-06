const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false, 
    trustServerCertificate: true,
  },
};

let pool;

async function getConnection() {
  if (pool) return pool; 

  try {
    pool = await sql.connect(config);
    console.log("Conectado a SQL Server");
    return pool;
  } catch (error) {
    console.error("Error al conectar a SQL Server:", error);
    throw error;
  }
}

module.exports = {
  sql,
  getConnection,
};
