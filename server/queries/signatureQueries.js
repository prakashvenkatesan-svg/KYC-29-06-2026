const pool = require("../config/db");

const saveSignature = async ({
  application_id,
  file_name,
  file_type,
  file_data,
}) => {
  return await pool.query(
    `
    INSERT INTO signature_uploads
    (
      application_id,
      file_name,
      file_type,
      signature_file,
      created_at
    )
    VALUES
    (
      $1,$2,$3,$4,NOW()
    )

    ON CONFLICT (application_id)

    DO UPDATE SET
      file_name = EXCLUDED.file_name,
      file_type = EXCLUDED.file_type,
      signature_file = EXCLUDED.signature_file

    RETURNING *
    `,
    [application_id, file_name, file_type, file_data],
  );
};

module.exports = {
  saveSignature,
};
    