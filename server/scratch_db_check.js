const pool = require("./config/db");

async function check() {
  const result = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'applicant_photo_uploads';
  `);
  console.log("applicant_photo_uploads columns:", result.rows);
  
  const result2 = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'signature_uploads';
  `);
  console.log("signature_uploads columns:", result2.rows);

  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
