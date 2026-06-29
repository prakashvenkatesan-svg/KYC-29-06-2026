require('dotenv').config();
const pool = require('./config/db');

async function resetEsign() {
  try {
    const applicationId = 61;
    
    // Reset the eSign fields so a new production request can be made
    const query = `
      UPDATE public.kyc_applications
      SET 
        esign_request_id = NULL,
        esign_document_id = NULL,
        esign_status = 'NOT_SELECTED',
        esign_last_provider_message = NULL,
        esign_redirect_url = NULL,
        current_step = 'ddpi'
      WHERE id = $1
    `;
    
    await pool.query(query, [applicationId]);
    console.log(`Successfully reset eSign status for application ${applicationId}!`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

resetEsign();
