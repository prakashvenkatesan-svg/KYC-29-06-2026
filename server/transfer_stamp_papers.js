require('dotenv').config();
const masterPool = require('./config/masterDb');
const appPool = require('./config/db');

async function transferStampPapers() {
  try {
    // Fetch all AVAILABLE stamp papers from masterdatanew
    const res = await masterPool.query("SELECT * FROM stamp_paper_master WHERE status = 'AVAILABLE'");
    const stampPapers = res.rows;
    
    console.log(`Found ${stampPapers.length} available stamp papers in masterdatanew.`);
    
    let inserted = 0;
    
    for (const sp of stampPapers) {
      // Check if it already exists in the main DB
      const existsRes = await appPool.query("SELECT id FROM stamp_paper_master WHERE stamp_number = $1 OR image_name = $2", [sp.stamp_number, sp.image_name]);
      
      if (existsRes.rows.length === 0) {
        // Ensure table has the right schema in app DB
        await appPool.query(`
          ALTER TABLE stamp_paper_master 
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE', 
          ADD COLUMN IF NOT EXISTS assigned_application_id BIGINT NULL, 
          ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP NULL, 
          ADD COLUMN IF NOT EXISTS used_at TIMESTAMP NULL, 
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(), 
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);

        await appPool.query(
          "INSERT INTO stamp_paper_master (stamp_number, image_name, image_path, status) VALUES ($1, $2, $3, $4)",
          [sp.stamp_number, sp.image_name, sp.image_path, sp.status]
        );
        inserted++;
      }
    }
    
    console.log(`Successfully transferred ${inserted} stamp papers to the main application database.`);
    
    // Check count in main DB
    const finalRes = await appPool.query("SELECT status, COUNT(*) FROM stamp_paper_master GROUP BY status");
    console.log("Current Stamp Papers in main DB:", finalRes.rows);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

transferStampPapers();
