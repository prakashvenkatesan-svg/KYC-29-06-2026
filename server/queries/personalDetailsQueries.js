const db = require("../config/db");

const upsertPersonalDetails = async ({
  application_id,
  father_name,
  mother_name,
  gender,
  marital_status,
  education,
  annual_income,
  trading_experience,
  politically_exposed,
  occupation,
  citizen_of_india,
  net_worth,
  running_account_authorization,
  country_of_birth,
  ddpi,
  aadhaar_address,
  income_declaration_accepted,
  rights_accepted,
}) => {
  const query = `
    INSERT INTO personal_details (
      application_id,
      father_name,
      mother_name,
      gender,
      marital_status,
      education,
      annual_income,
      trading_experience,
      politically_exposed,
      occupation,
      citizen_of_india,
      net_worth,
      running_account_authorization,
      country_of_birth,
      ddpi,
      aadhaar_address,
      income_declaration_accepted,
      rights_accepted,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP
    )
    ON CONFLICT (application_id)
    DO UPDATE SET
      father_name = EXCLUDED.father_name,
      mother_name = EXCLUDED.mother_name,
      gender = EXCLUDED.gender,
      marital_status = EXCLUDED.marital_status,
      education = EXCLUDED.education,
      annual_income = EXCLUDED.annual_income,
      trading_experience = EXCLUDED.trading_experience,
      politically_exposed = EXCLUDED.politically_exposed,
      occupation = EXCLUDED.occupation,
      citizen_of_india = EXCLUDED.citizen_of_india,
      net_worth = EXCLUDED.net_worth,
      running_account_authorization = EXCLUDED.running_account_authorization,
      country_of_birth = EXCLUDED.country_of_birth,
      ddpi = EXCLUDED.ddpi,
      aadhaar_address = EXCLUDED.aadhaar_address,
      income_declaration_accepted = EXCLUDED.income_declaration_accepted,
      rights_accepted = EXCLUDED.rights_accepted,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *;
  `;

  const values = [
    application_id,
    father_name,
    mother_name,
    gender,
    marital_status,
    education,
    annual_income,
    trading_experience,
    politically_exposed,
    occupation,
    citizen_of_india,
    net_worth,
    running_account_authorization,
    country_of_birth,
    ddpi,
    aadhaar_address,
    income_declaration_accepted,
    rights_accepted,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

const getApplicationById = async (application_id) => {
  const query = `SELECT * FROM kyc_applications WHERE id = $1 LIMIT 1`;
  const result = await db.query(query, [application_id]);
  return result.rows[0];
};

module.exports = {
  upsertPersonalDetails,
  getApplicationById,
};
