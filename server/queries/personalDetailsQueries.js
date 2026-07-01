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

  // Standing Instructions
  depository_credit_instruction,
  pledge_instruction,
  account_statement_requirement,
  electronic_transaction_statement,
  share_email_with_rta,
  annual_report_preference,
  dividend_interest_ecs,
  contract_note_preference,
  trust_facility_instruction,
  dis_at_account_opening,
  standing_instruction_completed,
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

      depository_credit_instruction,
      pledge_instruction,
      account_statement_requirement,
      electronic_transaction_statement,
      share_email_with_rta,
      annual_report_preference,
      dividend_interest_ecs,
      contract_note_preference,
      trust_facility_instruction,
      dis_at_account_opening,
      standing_instruction_completed,

      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21, $22, $23, $24, $25, $26,
      $27, $28, $29,
      CURRENT_TIMESTAMP
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
      running_account_authorization =
        EXCLUDED.running_account_authorization,
      country_of_birth = EXCLUDED.country_of_birth,
      ddpi = EXCLUDED.ddpi,
      aadhaar_address = EXCLUDED.aadhaar_address,
      income_declaration_accepted =
        EXCLUDED.income_declaration_accepted,
      rights_accepted = EXCLUDED.rights_accepted,

      depository_credit_instruction =
        EXCLUDED.depository_credit_instruction,

      pledge_instruction =
        EXCLUDED.pledge_instruction,

      account_statement_requirement =
        EXCLUDED.account_statement_requirement,

      electronic_transaction_statement =
        EXCLUDED.electronic_transaction_statement,

      share_email_with_rta =
        EXCLUDED.share_email_with_rta,

      annual_report_preference =
        EXCLUDED.annual_report_preference,

      dividend_interest_ecs =
        EXCLUDED.dividend_interest_ecs,

      contract_note_preference =
        EXCLUDED.contract_note_preference,

      trust_facility_instruction =
        EXCLUDED.trust_facility_instruction,

      dis_at_account_opening =
        EXCLUDED.dis_at_account_opening,

      standing_instruction_completed =
        EXCLUDED.standing_instruction_completed,

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

    // Standing Instructions
    depository_credit_instruction,
    pledge_instruction,
    account_statement_requirement,
    electronic_transaction_statement,
    share_email_with_rta,
    annual_report_preference,
    dividend_interest_ecs,
    contract_note_preference,
    trust_facility_instruction,
    dis_at_account_opening,
    standing_instruction_completed,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
};

const getApplicationById = async (application_id) => {
  const query = `
    SELECT *
    FROM kyc_applications
    WHERE id = $1
    LIMIT 1
  `;

  const result = await db.query(query, [application_id]);

  return result.rows[0];
};

module.exports = {
  upsertPersonalDetails,
  getApplicationById,
};
