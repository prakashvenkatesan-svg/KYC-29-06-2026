const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function checkMasterDb() {
  const pool = new Pool({
    host: process.env.MASTER_DB_HOST,
    port: process.env.MASTER_DB_PORT,
    database: process.env.MASTER_DB_NAME,
    user: process.env.MASTER_DB_USER,
    password: process.env.MASTER_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Connecting to masterdatanew...");

    // Check what tables exist
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log("Tables in masterdatanew:", tables.rows.map(r => r.table_name));

    // Check boid_master if it exists
    const hasBoid = tables.rows.some(r => r.table_name === 'boid_master');
    if (hasBoid) {
      const boids = await pool.query(`SELECT * FROM public.boid_master LIMIT 5`);
      console.log("boid_master sample:", boids.rows);
      const avail = await pool.query(`SELECT COUNT(*) FROM public.boid_master WHERE status = 'AVAILABLE'`);
      console.log("AVAILABLE boids count:", avail.rows[0].count);
    } else {
      console.log("boid_master table does NOT exist in masterdatanew!");
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await pool.end();
  }
}

checkMasterDb();
