const pool = require("../config/db");
const {
  normalizeDateForPostgres,
} = require("../utils/normalizeDateForPostgres");

/* INSERT PAN + DOB */
const insertPanVerification = async (application_id, pan_number, dob) => {
  return await pool.query(
    `
    INSERT INTO public.identity_verifications
    (
      application_id,
      pan_number,
      dob,
      created_at,
      updated_at
    )
    VALUES
    ($1, $2, $3, NOW(), NOW())

    ON CONFLICT (application_id)
    DO UPDATE SET
      pan_number = EXCLUDED.pan_number,
      dob = EXCLUDED.dob,
      updated_at = NOW()
    `,
    [application_id, pan_number, dob],
  );
};

const insertKraDetails = async (data) => {
  const query = `
    INSERT INTO public.identity_verifications
    (
      application_id,
      pan_number,
      dob,
      full_name,
      category,
      aadhaar_seeding_status,
      provider,
      provider_ref,
      kra_email,
      kra_mobile,
      gender,
      address_1,
      address_2,
      state,
      pincode,
      aadhaar_number,
      provider_dob,
      created_at,
      update_at
    )
    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,$11,$12,$13,$14,
      $15,$16,NOW(),NOW()
    )

    ON CONFLICT (application_id)

    DO UPDATE SET
      pan_number = EXCLUDED.pan_number,
      dob = EXCLUDED.dob,
      full_name = EXCLUDED.full_name,
      category = EXCLUDED.category,
      aadhaar_seeding_status = EXCLUDED.aadhaar_seeding_status,
      provider = EXCLUDED.provider,
      provider_ref = EXCLUDED.provider_ref,
      kra_email = EXCLUDED.kra_email,
      kra_mobile = EXCLUDED.kra_mobile,
      gender = EXCLUDED.gender,
      address_1 = EXCLUDED.address_1,
      address_2 = EXCLUDED.address_2,
      state = EXCLUDED.state,
      pincode = EXCLUDED.pincode,
      aadhaar_number = EXCLUDED.aadhaar_number,
      provider_dob = EXCLUDED.provider_dob,
      update_at = NOW()

    RETURNING *
  `;

  const values = [
    data.application_id,
    data.pan_number,
    data.dob,
    data.full_name,
    data.category,
    data.aadhaar_seeding_status,
    data.provider,
    data.provider_ref,
    data.kra_email,
    data.kra_mobile,
    data.gender,
    data.address_1,
    data.address_2,
    data.state,
    data.pincode,
    data.aadhaar_number,
    data.provider_dob,
  ];

  return await pool.query(query, values);
};

const updateKraDetails = async (data) => {
  const query = `
    UPDATE public.identity_verifications
    SET
      kra_email = $1,
      kra_mobile = $2,
      gender = $3,
      full_name = $4,
      address_1 = $5,
      address_2 = $6,
      state = $7,
      pincode = $8,
      aadhaar_number = $9,
      provider_dob = $10,
      updated_at = NOW()
    WHERE application_id = $11
    RETURNING *
  `;

  return await pool.query(query, [
    data.kra_email,
    data.kra_mobile,
    data.gender,
    data.full_name,
    data.address_1,
    data.address_2,
    data.state,
    data.pincode,
    data.aadhaar_number,
    data.provider_dob,
    data.application_id,
  ]);
};

const savePanVerification = async (data) => {
  const normalizedDob = normalizeDateForPostgres(data.dob);

  const query = `
    WITH updated AS (
      UPDATE public.identity_verifications iv
      SET
        pan_number = COALESCE(NULLIF($2, ''), iv.pan_number),
        full_name = COALESCE(NULLIF($3, ''), iv.full_name),
        category = COALESCE(NULLIF($4, ''), iv.category),
        aadhaar_seeding_status = COALESCE(
          NULLIF($5, ''),
          iv.aadhaar_seeding_status
        ),
        dob = COALESCE(CAST($6 AS date), iv.dob),
        updated_at = NOW()
      WHERE iv.application_id = $1
      RETURNING iv.*
    ),
    inserted AS (
      INSERT INTO public.identity_verifications
      (
        application_id,
        pan_number,
        dob,
        full_name,
        category,
        aadhaar_seeding_status,
        created_at,
        updated_at
      )
      SELECT
        $1,
        NULLIF($2, ''),
        CAST($6 AS date),
        NULLIF($3, ''),
        NULLIF($4, ''),
        NULLIF($5, ''),
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM updated)
        AND NULLIF($2, '') IS NOT NULL
        AND $6 IS NOT NULL
      RETURNING *
    )
    SELECT * FROM updated
    UNION ALL
    SELECT * FROM inserted
  `;

  const values = [
    data.application_id,
    data.pan_number,
    data.full_name,
    data.category,
    data.aadhaar_seeding_status,
    normalizedDob,
  ];

  return await pool.query(query, values);
};

const saveDigilockerDetails = async (data) => {
  const query = `
    INSERT INTO public.digilocker_details
    (
      application_id,

      aadhaar_number_masked,

      name,

      father_name,

      gender,

      dob,

      address,

      photo_base64,

      provider,

      provider_ref,

      created_at,
      updated_at
    )

    VALUES
    (
      $1,$2,$3,$4,$5,$6,$7,$8,
      $9,$10,
      NOW(),NOW()
    )

    ON CONFLICT (application_id)

    DO UPDATE SET

      aadhaar_number_masked =
        EXCLUDED.aadhaar_number_masked,

      name = EXCLUDED.name,

      father_name = EXCLUDED.father_name,

      gender = EXCLUDED.gender,

      dob = EXCLUDED.dob,

      address = EXCLUDED.address,

      photo_base64 = EXCLUDED.photo_base64,

      provider = EXCLUDED.provider,

      provider_ref = EXCLUDED.provider_ref,

      updated_at = NOW()

    RETURNING *
  `;

  const values = [
    data.application_id,

    data.aadhaar_number_masked,

    data.name,

    data.father_name,

    data.gender,

    data.dob,

    data.address,

    data.photo_base64,

    data.provider,

    data.provider_ref,
  ];

  return await pool.query(query, values);
};

const upsertDigilockerIdentityDetails = async (data) => {
  const normalizedProviderDob = normalizeDateForPostgres(data.dob);

  const query = `
    WITH updated AS (
      UPDATE public.identity_verifications iv
      SET
        full_name = COALESCE(NULLIF($2, ''), iv.full_name),
        gender = COALESCE(NULLIF($3, ''), iv.gender),
        address_1 = COALESCE(NULLIF($4, ''), iv.address_1),
        address_2 = COALESCE(NULLIF($5, ''), iv.address_2),
        state = COALESCE(NULLIF($6, ''), iv.state),
        pincode = COALESCE(NULLIF($7, ''), iv.pincode),
        provider = COALESCE(NULLIF($8, ''), iv.provider),
        provider_ref = COALESCE(NULLIF($9, ''), iv.provider_ref),
        provider_dob = COALESCE(CAST($10 AS date), iv.provider_dob),
        updated_at = NOW()
      WHERE iv.application_id = $1
      RETURNING iv.*
    ),
    inserted AS (
      INSERT INTO public.identity_verifications
      (
        application_id,
        pan_number,
        dob,
        full_name,
        gender,
        address_1,
        address_2,
        state,
        pincode,
        provider,
        provider_ref,
        provider_dob,
        created_at,
        updated_at
      )
      SELECT
        $1,
        iv.pan_number,
        CAST($10 AS date),
        NULLIF($2, ''),
        NULLIF($3, ''),
        NULLIF($4, ''),
        NULLIF($5, ''),
        NULLIF($6, ''),
        NULLIF($7, ''),
        NULLIF($8, ''),
        NULLIF($9, ''),
        CAST($10 AS date),
        NOW(),
        NOW()
      FROM public.identity_verifications iv
      WHERE iv.application_id = $1
        AND $10 IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM updated)
      LIMIT 1
      RETURNING *
    )
    SELECT * FROM updated
    UNION ALL
    SELECT * FROM inserted
  `;

  const values = [
    data.application_id,
    data.name,
    data.gender,
    data.address_1,
    data.address_2,
    data.state,
    data.pincode,
    data.provider,
    data.provider_ref,
    normalizedProviderDob,
  ];

  return await pool.query(query, values);
};

module.exports = {
  insertPanVerification,
  updateKraDetails,
  insertKraDetails,
  savePanVerification,
  saveDigilockerDetails,
  upsertDigilockerIdentityDetails,
};
