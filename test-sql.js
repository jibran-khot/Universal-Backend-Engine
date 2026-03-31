const sql = require("mssql");

const config = {
  server: "DESKTOP-NU2BSB0",
  port: 50349,
  user: "sa",
  password: "123",
  database: "EcomSetup",
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function run() {
  try {
    await sql.connect(config);
    console.log("SQL CONNECTED SUCCESSFULLY");
  } catch (err) {
    console.log("SQL CONNECTION FAILED");
    console.log(err);
  }
}

run();
