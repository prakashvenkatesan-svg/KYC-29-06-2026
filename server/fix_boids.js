const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function fixBoids() {
  // Check capital DB for application 50's boid
  const capitalPool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  const masterPool = new Pool({
    host: process.env.MASTER_DB_HOST,
    port: process.env.MASTER_DB_PORT,
    database: process.env.MASTER_DB_NAME,
    user: process.env.MASTER_DB_USER,
    password: process.env.MASTER_DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Check application 50's boid
    const appResult = await capitalPool.query(
      `SELECT id, application_number, boid FROM public.kyc_applications WHERE id = 50`
    );
    console.log("Application 50:", appResult.rows[0]);

    // Check all boids in master
    const allBoids = await masterPool.query(
      `SELECT boid_number, status, application_id FROM public.boid_master ORDER BY boid_number`
    );
    console.log("\nAll BOIDs in master:");
    allBoids.rows.forEach(b => console.log(`  ${b.boid_number} - ${b.status} - app:${b.application_id}`));

    // Reset ALL boids that are ASSIGNED to non-existent or completed applications back to AVAILABLE
    // First check which application_ids exist
    const appIds = await capitalPool.query(`SELECT id FROM public.kyc_applications`);
    const existingIds = appIds.rows.map(r => String(r.id));
    console.log("\nExisting application IDs:", existingIds);

    const toReset = allBoids.rows.filter(b =>
      b.status === 'ASSIGNED' && (!b.application_id || !existingIds.includes(String(b.application_id)))
    );
    console.log("\nBOIDs to reset (assigned to non-existent apps):", toReset.map(b => b.boid_number));

    if (toReset.length > 0) {
      await masterPool.query(
        `UPDATE public.boid_master SET status = 'AVAILABLE', assigned_at = NULL, application_id = NULL
         WHERE boid_number = ANY($1)`,
        [toReset.map(b => b.boid_number)]
      );
      console.log(`Reset ${toReset.length} orphaned BOIDs to AVAILABLE`);
    }

    // Also check if app 50 already has a boid assigned in master
    const app50Boid = allBoids.rows.find(b => String(b.application_id) === '50');
    console.log("\nBOID assigned to app 50 in master:", app50Boid || "none");

    // Count available after reset
    const avail = await masterPool.query(`SELECT COUNT(*) FROM public.boid_master WHERE status = 'AVAILABLE'`);
    console.log("\nAVAILABLE boids after reset:", avail.rows[0].count);

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await capitalPool.end();
    await masterPool.end();
  }
}

fixBoids();
