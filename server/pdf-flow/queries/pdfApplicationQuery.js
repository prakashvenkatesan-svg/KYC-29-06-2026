const pool = require("../../config/db");

const PDF_APPLICATION_QUERY = `
  SELECT row_to_json(application_payload) AS application
  FROM (
    SELECT
      ka.*,
      (
        SELECT row_to_json(contact_row)
        FROM (
          SELECT *
          FROM public.contact_details
          WHERE application_id = ka.id
          LIMIT 1
        ) AS contact_row
      ) AS contact_details,
      (
        SELECT row_to_json(personal_row)
        FROM (
          SELECT *
          FROM public.personal_details
          WHERE application_id = ka.id
          LIMIT 1
        ) AS personal_row
      ) AS personal_details,
      (
        SELECT row_to_json(identity_row)
        FROM (
          SELECT *
          FROM public.identity_verifications
          WHERE application_id = ka.id
          LIMIT 1
        ) AS identity_row
      ) AS identity_details,
      (
        SELECT row_to_json(digilocker_row)
        FROM (
          SELECT *
          FROM public.digilocker_details
          WHERE application_id = ka.id::text
          ORDER BY created_at DESC NULLS LAST
          LIMIT 1
        ) AS digilocker_row
      ) AS digilocker_details,
      (
        SELECT row_to_json(kra_row)
        FROM (
          SELECT *
          FROM public.cvlkra_data
          WHERE application_id = ka.id
          ORDER BY updated_at DESC NULLS LAST
          LIMIT 1
        ) AS kra_row
      ) AS kra_details,
      (
        SELECT row_to_json(applicant_photo_row)
        FROM (
          SELECT *
          FROM public.applicant_photo_uploads
          WHERE application_id = ka.id
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        ) AS applicant_photo_row
      ) AS applicant_photo_details,
      (
        SELECT row_to_json(pan_card_row)
        FROM (
          SELECT *
          FROM public.pan_card_upload
          WHERE application_id = ka.id
          ORDER BY id DESC
          LIMIT 1
        ) AS pan_card_row
      ) AS pan_card_upload_details,
      (
        SELECT row_to_json(signature_row)
        FROM (
          SELECT *
          FROM public.signature_uploads
          WHERE application_id = ka.id
          ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
          LIMIT 1
        ) AS signature_row
      ) AS signature_upload_details,
      NULL::json AS pan_verification_details,
      (
        SELECT row_to_json(bank_row)
        FROM (
          SELECT *
          FROM public.bank_details
          WHERE application_id = ka.id
          LIMIT 1
        ) AS bank_row
      ) AS bank_details,
      (
        SELECT row_to_json(client_code_row)
        FROM (
          SELECT *
          FROM public.client_codes cc
          WHERE (
            BTRIM(
              COALESCE(
                (
                  SELECT contact_email.email
                  FROM public.contact_details contact_email
                  WHERE contact_email.application_id = ka.id
                  LIMIT 1
                ),
                ''
              )
            ) <> ''
            AND UPPER(BTRIM(cc.email)) = UPPER(
              BTRIM(
                COALESCE(
                  (
                    SELECT contact_email.email
                    FROM public.contact_details contact_email
                    WHERE contact_email.application_id = ka.id
                    LIMIT 1
                  ),
                  ''
                )
              )
            )
          )
          OR (
            BTRIM(
              COALESCE(
                (
                  SELECT identity_pan.pan_number
                  FROM public.identity_verifications identity_pan
                  WHERE identity_pan.application_id = ka.id
                  LIMIT 1
                ),
                ''
              )
            ) <> ''
            AND UPPER(BTRIM(cc.pan_number)) = UPPER(
              BTRIM(
                COALESCE(
                  (
                    SELECT identity_pan.pan_number
                    FROM public.identity_verifications identity_pan
                    WHERE identity_pan.application_id = ka.id
                    LIMIT 1
                  ),
                  ''
                )
              )
            )
          )
          ORDER BY cc.created_at DESC NULLS LAST, cc.id DESC
          LIMIT 1
        ) AS client_code_row
      ) AS client_code_details,
      (
        SELECT COALESCE(json_agg(nominee_row ORDER BY nominee_row.id), '[]'::json)
        FROM (
          SELECT *
          FROM public.nominee_details
          WHERE application_id = ka.id
        ) AS nominee_row
      ) AS nominee_details
    FROM public.kyc_applications ka
    WHERE ka.id = $1
  ) AS application_payload;
`;

const fetchApplicationForPdf = async (applicationId) => {
  const result = await pool.query(PDF_APPLICATION_QUERY, [applicationId]);
  return result.rows[0]?.application || null;
};

module.exports = {
  fetchApplicationForPdf,
};
