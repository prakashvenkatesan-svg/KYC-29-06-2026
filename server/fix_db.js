require('dotenv').config();
const pool = require('./config/masterDb');

async function fix() {
  try {
    await pool.query(`UPDATE stamp_paper_master SET image_path = REPLACE(image_path, 'Stamp paper/', 'stamp_papers/') WHERE image_path LIKE 'Stamp paper/%'`);
    console.log('Fixed paths back to stamp_papers');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
