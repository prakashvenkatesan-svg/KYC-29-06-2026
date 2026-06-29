const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function resetStamps() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to capital database...");
    const res = await pool.query(`
      UPDATE public.stamp_paper_master
      SET 
        status = 'AVAILABLE',
        assigned_application_id = NULL,
        assigned_at = NULL,
        used_at = NULL,
        updated_at = NOW()
    `);
    console.log(`Successfully reset ${res.rowCount} stamp papers to AVAILABLE in capital database.`);
  } catch (err) {
    console.error("Error during reset:", err);
  } finally {
    await pool.end();
  }
}

resetStamps();
