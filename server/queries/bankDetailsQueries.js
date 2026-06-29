const pool = require("../config/db");

const getApplicationById = async (applicationId) => {
  const result = await pool.query(
    `
        SELECT * FROM application
        WHERE id = $1
        `,
    [applicationId],
  );

  return result.rows[0];
};

const upsertBankDetails = async ({
  application_id,
  account_number,
  confirm_account_number,
  ifsc_code,
  account_type,
  bank_name,
  branch_name,
  bank_address,
  verification_type,
  verification_status,
  bank_verified,
  bank_response,
}) => {
  const result = await pool.query(
    `
    INSERT INTO bank_details (
      application_id,
      account_number,
      confirm_account_number,
      ifsc_code,
      account_type,
      bank_name,
      branch_name,
      bank_address,
      verification_type,
      verification_status,
      bank_verified,
      bank_response,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11, $12,
      NOW(), NOW()
    )
    ON CONFLICT (application_id)
    DO UPDATE SET
      account_number = EXCLUDED.account_number,
      confirm_account_number = EXCLUDED.confirm_account_number,
      ifsc_code = EXCLUDED.ifsc_code,
      account_type = EXCLUDED.account_type,
      bank_name = EXCLUDED.bank_name,
      branch_name = EXCLUDED.branch_name,
      bank_address = EXCLUDED.bank_address,
      verification_type = EXCLUDED.verification_type,
      verification_status = EXCLUDED.verification_status,
      bank_verified = EXCLUDED.bank_verified,
      bank_response = EXCLUDED.bank_response,
      updated_at = NOW()
    RETURNING *
    `,
    [
      application_id,
      account_number,
      confirm_account_number,
      ifsc_code,
      account_type,
      bank_name,
      branch_name,
      bank_address,
      verification_type || null,
      verification_status || "PENDING",
      bank_verified || false,
      bank_response ? JSON.stringify(bank_response) : null,
    ],
  );

  return result.rows[0];
};

const saveReversePennyTransaction = async (data) => {
  const query = `
    INSERT INTO reverse_penny_transactions (
      application_id,
      transaction_id,
      status
    )
    VALUES ($1,$2,$3)
  `;

  await pool.query(query, [
    data.application_id,
    data.transaction_id,
    data.status,
  ]);
};

const updateBankVerificationStatus = async (data) => {
  const query = `
    UPDATE reverse_penny_transactions
    SET
      status = $1,
      updated_at = NOW()
    WHERE transaction_id = $2
  `;

  await pool.query(query, [data.verification_status, data.transaction_id]);
};

const getTransactionStatus = async (transactionId) => {
  const query = `
    SELECT
      status as verification_status,
      CASE
        WHEN status = 'VERIFIED'
        THEN true
        ELSE false
      END as bank_verified
    FROM reverse_penny_transactions
    WHERE transaction_id = $1
  `;

  const result = await pool.query(query, [transactionId]);

  return result.rows[0];
};

module.exports = {
  getApplicationById,
  upsertBankDetails,
  saveReversePennyTransaction,
  updateBankVerificationStatus,
  getTransactionStatus,
};
