const db = require("../config/db");

const getApplicationById = async (application_id) => {
  const query = `SELECT * FROM kyc_applications WHERE id = $1 LIMIT 1`;
  const result = await db.query(query, [application_id]);
  return result.rows[0];
};

const getNomineeCount = async (application_id) => {
  const query = `
    SELECT COUNT(*)::int AS total
    FROM nominee_details
    WHERE application_id = $1
  `;
  const result = await db.query(query, [application_id]);
  return result.rows[0].total;
};

const createNominee = async ({
  application_id,
  nominee_name,
  dob,
  mobile,
  email,
  relation,
  gender,
  nominee_proof_type,
  aadhaar,
  pan,
  nominee_address,
  same_address,
}) => {
  const query = `
    INSERT INTO nominee_details (
      application_id,
      nominee_name,
      dob,
      mobile,
      email,
      relation,
      gender,
      nominee_proof_type,
      aadhaar,
      pan,
      nominee_address,
      same_address,
      allocation_percentage,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 0, CURRENT_TIMESTAMP
    )
    RETURNING *;
  `;

  const values = [
    application_id,
    nominee_name,
    dob,
    mobile,
    email,
    relation,
    gender,
    nominee_proof_type,
    aadhaar || null,
    pan || null,
    nominee_address,
    same_address,
  ];

  const result = await db.query(query, values);
  return result.rows[0];
};

const getNomineesByApplicationId = async (application_id) => {
  const query = `
    SELECT *
    FROM nominee_details
    WHERE application_id = $1
    ORDER BY id ASC
  `;
  const result = await db.query(query, [application_id]);
  return result.rows;
};

const updateNomineeAllocation = async (nominee_id, allocation_percentage) => {
  const query = `
    UPDATE nominee_details
    SET allocation_percentage = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  const result = await db.query(query, [nominee_id, allocation_percentage]);
  return result.rows[0];
};

const deleteNomineeById = async (nominee_id) => {
  const query = `DELETE FROM nominee_details WHERE id = $1 RETURNING *`;
  const result = await db.query(query, [nominee_id]);
  return result.rows[0];
};

module.exports = {
  getApplicationById,
  getNomineeCount,
  createNominee,
  getNomineesByApplicationId,
  updateNomineeAllocation,
  deleteNomineeById,
};
