const buildCvlkraStateCodeCase = (fieldName) => `
  CASE
    WHEN UPPER(${fieldName}) = 'JAMMU AND KASHMIR' THEN '001'
    WHEN UPPER(${fieldName}) = 'HIMACHAL PRADESH' THEN '002'
    WHEN UPPER(${fieldName}) = 'PUNJAB' THEN '003'
    WHEN UPPER(${fieldName}) = 'CHANDIGARH' THEN '004'
    WHEN UPPER(${fieldName}) IN ('UTTARAKHAND', 'UTTARANCHAL') THEN '005'
    WHEN UPPER(${fieldName}) = 'HARYANA' THEN '006'
    WHEN UPPER(${fieldName}) = 'DELHI' THEN '007'
    WHEN UPPER(${fieldName}) = 'RAJASTHAN' THEN '008'
    WHEN UPPER(${fieldName}) = 'UTTAR PRADESH' THEN '009'
    WHEN UPPER(${fieldName}) = 'BIHAR' THEN '010'
    WHEN UPPER(${fieldName}) = 'SIKKIM' THEN '011'
    WHEN UPPER(${fieldName}) = 'ARUNACHAL PRADESH' THEN '012'
    WHEN UPPER(${fieldName}) = 'NAGALAND' THEN '013'
    WHEN UPPER(${fieldName}) = 'MANIPUR' THEN '014'
    WHEN UPPER(${fieldName}) = 'MIZORAM' THEN '015'
    WHEN UPPER(${fieldName}) = 'TRIPURA' THEN '016'
    WHEN UPPER(${fieldName}) = 'MEGHALAYA' THEN '017'
    WHEN UPPER(${fieldName}) = 'ASSAM' THEN '018'
    WHEN UPPER(${fieldName}) = 'WEST BENGAL' THEN '019'
    WHEN UPPER(${fieldName}) = 'JHARKHAND' THEN '020'
    WHEN UPPER(${fieldName}) IN ('ODISHA', 'ORISSA') THEN '021'
    WHEN UPPER(${fieldName}) = 'CHHATTISGARH' THEN '022'
    WHEN UPPER(${fieldName}) = 'MADHYA PRADESH' THEN '023'
    WHEN UPPER(${fieldName}) = 'GUJARAT' THEN '024'
    WHEN UPPER(${fieldName}) IN ('DAMAN AND DIU', 'DAMAN & DIU') THEN '025'
    WHEN UPPER(${fieldName}) IN ('DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'DADRA & NAGAR HAVELI AND DAMAN & DIU') THEN '026'
    WHEN UPPER(${fieldName}) = 'MAHARASHTRA' THEN '027'
    WHEN UPPER(${fieldName}) = 'KARNATAKA' THEN '029'
    WHEN UPPER(${fieldName}) = 'GOA' THEN '030'
    WHEN UPPER(${fieldName}) = 'LAKSHADWEEP' THEN '031'
    WHEN UPPER(${fieldName}) = 'KERALA' THEN '032'
    WHEN UPPER(${fieldName}) = 'TAMIL NADU' THEN '033'
    WHEN UPPER(${fieldName}) IN ('PUDUCHERRY', 'PONDICHERRY') THEN '034'
    WHEN UPPER(${fieldName}) IN ('ANDAMAN & NICOBAR ISLANDS', 'ANDAMAN AND NICOBAR ISLANDS') THEN '035'
    WHEN UPPER(${fieldName}) = 'TELANGANA' THEN '036'
    WHEN UPPER(${fieldName}) = 'ANDHRA PRADESH' THEN '037'
    WHEN UPPER(${fieldName}) = 'LADAKH' THEN '038'
    WHEN ${fieldName} ~ '^[0-9]{3}$' THEN ${fieldName}
    ELSE NULL
  END
`;

const buildCvlkraGenderCodeCase = (fieldName) => `
  CASE
    WHEN UPPER(COALESCE(${fieldName}, '')) IN ('MALE', 'M') THEN 'M'
    WHEN UPPER(COALESCE(${fieldName}, '')) IN ('FEMALE', 'F') THEN 'F'
    WHEN UPPER(COALESCE(${fieldName}, '')) IN ('TRANSGENDER', 'T', 'THIRD GENDER', 'OTHER', 'O') THEN 'T'
    ELSE NULL
  END
`;

const buildCvlkraSourceCte = () => `
  WITH overrides AS (
    SELECT COALESCE($2::jsonb, '{}'::jsonb) AS data
  ),
  latest_identity AS (
    SELECT
      iv.application_id,
      iv.provider,
      iv.pan_number,
      iv.dob,
      iv.full_name,
      iv.category,
      iv.gender,
      iv.address_1,
      iv.address_2,
      iv.state,
      iv.pincode,
      iv.aadhaar_number,
      iv.pan_verified
    FROM public.identity_verifications iv
    WHERE iv.application_id = $1
    ORDER BY iv.updated_at DESC NULLS LAST, iv.id DESC
    LIMIT 1
  ),
  latest_pan_verification AS (
    SELECT
      pv.application_id,
      pv.pan_number,
      pv.full_name,
      pv.category
    FROM public.pan_verifications pv
    WHERE pv.application_id = $1::text
    ORDER BY pv.updated_at DESC NULLS LAST, pv.id DESC
    LIMIT 1
  ),
  latest_contact AS (
    SELECT
      cd.application_id,
      cd.email,
      cd.mobile_number,
      cd.mobile_verified,
      cd.email_verified
    FROM public.contact_details cd
    WHERE cd.application_id = $1
    ORDER BY cd.updated_at DESC NULLS LAST, cd.id DESC
    LIMIT 1
  ),
  latest_personal AS (
    SELECT
      pd.application_id,
      pd.father_name,
      pd.gender,
      pd.marital_status,
      pd.annual_income,
      pd.net_worth,
      pd.occupation,
      pd.citizen_of_india,
      pd.country_of_birth,
      pd.politically_exposed,
      pd.aadhaar_address
    FROM public.personal_details pd
    WHERE pd.application_id = $1
    ORDER BY pd.updated_at DESC NULLS LAST, pd.id DESC
    LIMIT 1
  ),
  latest_digilocker AS (
    SELECT
      dd.application_id,
      dd.name,
      dd.father_name,
      dd.gender,
      CASE
        WHEN NULLIF(BTRIM(dd.dob), '') ~ '^\d{2}/\d{2}/\d{4}$'
        THEN TO_DATE(NULLIF(BTRIM(dd.dob), ''), 'DD/MM/YYYY')
        WHEN NULLIF(BTRIM(dd.dob), '') ~ '^\d{4}-\d{2}-\d{2}$'
        THEN CAST(NULLIF(BTRIM(dd.dob), '') AS date)
        ELSE NULL
      END AS dob,
      dd.address
    FROM public.digilocker_details dd
    WHERE dd.application_id = $1::text
    ORDER BY dd.updated_at DESC NULLS LAST, dd.id DESC
    LIMIT 1
  ),
  source_row AS (
    SELECT
      ka.id AS application_id,
      ka.created_at AS application_created_at,
      NULLIF(BTRIM(COALESCE(li.pan_number, lpv.pan_number)), '') AS source_pan_number,
      COALESCE(li.dob, ld.dob) AS source_dob,
      NULLIF(BTRIM(COALESCE(li.full_name, lpv.full_name, ld.name)), '') AS source_full_name,
      NULLIF(BTRIM(COALESCE(lp.father_name, ld.father_name)), '') AS source_father_name,
      NULLIF(BTRIM(COALESCE(li.gender, lp.gender, ld.gender)), '') AS source_gender,
      NULLIF(BTRIM(COALESCE(li.address_1, lp.aadhaar_address, ld.address)), '') AS source_address_line1,
      NULLIF(BTRIM(li.address_2), '') AS source_address_line2,
      NULLIF(BTRIM(COALESCE(lp.aadhaar_address, ld.address)), '') AS source_address_text,
      NULLIF(BTRIM(li.address_2), '') AS source_city,
      NULLIF(BTRIM(li.state), '') AS source_state,
      NULLIF(BTRIM(li.pincode), '') AS source_pincode,
      CASE
        WHEN li.aadhaar_number ~ '^[0-9]{12}$' THEN li.aadhaar_number
        ELSE NULL
      END AS source_aadhaar_number,
      NULLIF(BTRIM(lc.email), '') AS source_email,
      NULLIF(BTRIM(lc.mobile_number), '') AS source_mobile,
      lc.mobile_verified AS source_mobile_verified,
      lc.email_verified AS source_email_verified,
      NULLIF(BTRIM(lp.annual_income), '') AS source_annual_income,
      NULLIF(BTRIM(lp.occupation), '') AS source_occupation,
      NULLIF(BTRIM(lp.marital_status), '') AS source_marital_status,
      NULLIF(BTRIM(lp.politically_exposed), '') AS source_politically_exposed,
      NULLIF(BTRIM(lp.country_of_birth), '') AS source_country_of_birth,
      NULLIF(BTRIM(lp.citizen_of_india), '') AS source_citizen_of_india,
      existing.company_code AS existing_company_code,
      existing.app_pos_code AS existing_app_pos_code,
      existing.app_updtflg AS existing_app_updtflg,
      existing.app_type AS existing_app_type,
      existing.app_ipv_flag AS existing_app_ipv_flag,
      existing.app_nationality AS existing_app_nationality,
      existing.app_res_status AS existing_app_res_status,
      existing.app_cor_add_proof AS existing_app_cor_add_proof,
      existing.app_per_add_proof AS existing_app_per_add_proof,
      existing.app_income AS existing_app_income,
      existing.app_occ AS existing_app_occ,
      existing.app_pol_conn AS existing_app_pol_conn,
      existing.app_doc_proof AS existing_app_doc_proof,
      existing.app_mar_status AS existing_app_mar_status,
      existing.app_kyc_mode AS existing_app_kyc_mode,
      existing.app_ver_no AS existing_app_ver_no,
      existing.app_kra_code AS existing_app_kra_code
    FROM public.kyc_applications ka
    LEFT JOIN latest_identity li
      ON li.application_id = ka.id
    LEFT JOIN latest_pan_verification lpv
      ON lpv.application_id = ka.id::text
    LEFT JOIN latest_contact lc
      ON lc.application_id = ka.id
    LEFT JOIN latest_personal lp
      ON lp.application_id = ka.id
    LEFT JOIN latest_digilocker ld
      ON ld.application_id = ka.id::text
    LEFT JOIN public.cvlkra_data existing
      ON existing.application_id = ka.id
    WHERE ka.id = $1
  ),
  prepared_row AS (
    SELECT
      source_row.application_id,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'company_code'), ''),
        source_row.existing_company_code,
        NULLIF(BTRIM(overrides.data->>'app_pos_code'), ''),
        source_row.existing_app_pos_code
      ) AS company_code,
      TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') AS batch_date,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_updtflg'), ''),
        source_row.existing_app_updtflg,
        CASE
          -- TODO: CVLKRA update-flag semantics need business confirmation; this keeps first export distinct from re-export.
          WHEN EXISTS (
            SELECT 1
            FROM public.cvlkra_data existing_cvl
            WHERE existing_cvl.application_id = source_row.application_id
          ) THEN '99'
          ELSE '01'
        END
      ) AS app_updtflg,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_pos_code'), ''),
        source_row.existing_app_pos_code,
        NULLIF(BTRIM(overrides.data->>'company_code'), ''),
        source_row.existing_company_code
      ) AS app_pos_code,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_type'), ''),
        source_row.existing_app_type,
        'I'
      ) AS app_type,
      NULL::text AS app_no,
      TO_CHAR(COALESCE(source_row.application_created_at::date, CURRENT_DATE), 'DD/MM/YYYY') AS app_date,
      source_row.source_pan_number AS app_pan_no,
      CASE
        WHEN source_row.source_pan_number IS NOT NULL THEN 'Y'
        ELSE NULL
      END AS app_pan_copy,
      'N'::text AS app_exmt,
      NULL::text AS app_exmt_cat,
      NULLIF(BTRIM(overrides.data->>'app_exmt_id_proof'), '') AS app_exmt_id_proof,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_ipv_flag'), ''),
        source_row.existing_app_ipv_flag,
        'E'
      ) AS app_ipv_flag,
      TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') AS app_ipv_date,
      ${buildCvlkraGenderCodeCase("source_row.source_gender")} AS app_gen,
      source_row.source_full_name AS app_name,
      -- TODO: Relationship prefix like S/o, D/o, W/o is not stored separately in current KYC tables.
      source_row.source_father_name AS app_f_name,
      NULL::text AS app_regno,
      TO_CHAR(source_row.source_dob, 'DD/MM/YYYY') AS app_dob_incorp,
      NULL::text AS app_commence_dt,
      CASE
        WHEN UPPER(COALESCE(source_row.source_citizen_of_india, '')) IN ('YES', 'Y', 'TRUE')
          OR UPPER(COALESCE(source_row.source_country_of_birth, '')) IN ('IN', 'IND', 'INDIA')
        THEN '01'
        ELSE COALESCE(
          NULLIF(BTRIM(overrides.data->>'app_nationality'), ''),
          source_row.existing_app_nationality
        )
      END AS app_nationality,
      NULL::text AS app_oth_nationality,
      NULL::text AS app_comp_status,
      NULL::text AS app_oth_comp_status,
      CASE
        WHEN UPPER(COALESCE(source_row.source_citizen_of_india, '')) IN ('YES', 'Y', 'TRUE')
          OR UPPER(COALESCE(source_row.source_country_of_birth, '')) IN ('IN', 'IND', 'INDIA')
        THEN 'R'
        ELSE COALESCE(
          NULLIF(BTRIM(overrides.data->>'app_res_status'), ''),
          source_row.existing_app_res_status
        )
      END AS app_res_status,
      NULL::text AS app_res_status_proof,
      CASE
        WHEN source_row.source_aadhaar_number IS NOT NULL THEN RIGHT(source_row.source_aadhaar_number, 4)
        ELSE NULL
      END AS app_uid_no,
      COALESCE(source_row.source_address_line1, source_row.source_address_text) AS app_cor_add1,
      COALESCE(source_row.source_address_line2, source_row.source_pincode) AS app_cor_add2,
      NULL::text AS app_cor_add3,
      source_row.source_city AS app_cor_city,
      source_row.source_pincode AS app_cor_pincd,
      ${buildCvlkraStateCodeCase("source_row.source_state")} AS app_cor_state,
      CASE
        WHEN COALESCE(source_row.source_address_line1, source_row.source_address_text) IS NOT NULL THEN '101'
        ELSE NULL
      END AS app_cor_ctry,
      NULL::text AS app_off_isd,
      NULL::text AS app_off_std,
      NULL::text AS app_off_no,
      NULL::text AS app_res_isd,
      NULL::text AS app_res_std,
      NULL::text AS app_res_no,
      NULL::text AS app_mob_isd,
      source_row.source_mobile AS app_mob_no,
      NULL::text AS app_fax_isd,
      NULL::text AS app_fax_std,
      NULL::text AS app_fax_no,
      source_row.source_email AS app_email,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_cor_add_proof'), ''),
        source_row.existing_app_cor_add_proof
      ) AS app_cor_add_proof,
      CASE
        -- TODO: CVLKRA address reference source needs business confirmation; Aadhaar last 4 is staged when available.
        WHEN source_row.source_aadhaar_number IS NOT NULL THEN RIGHT(source_row.source_aadhaar_number, 4)
        ELSE NULL
      END AS app_cor_add_ref,
      TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') AS app_cor_add_dt,
      'Y'::text AS app_per_add_flag,
      COALESCE(source_row.source_address_line1, source_row.source_address_text) AS app_per_add1,
      COALESCE(source_row.source_address_line2, source_row.source_pincode) AS app_per_add2,
      NULL::text AS app_per_add3,
      source_row.source_city AS app_per_city,
      source_row.source_pincode AS app_per_pincd,
      ${buildCvlkraStateCodeCase("source_row.source_state")} AS app_per_state,
      CASE
        WHEN COALESCE(source_row.source_address_line1, source_row.source_address_text) IS NOT NULL THEN '101'
        ELSE NULL
      END AS app_per_ctry,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_per_add_proof'), ''),
        source_row.existing_app_per_add_proof
      ) AS app_per_add_proof,
      CASE
        WHEN source_row.source_aadhaar_number IS NOT NULL THEN RIGHT(source_row.source_aadhaar_number, 4)
        ELSE NULL
      END AS app_per_add_ref,
      TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') AS app_per_add_dt,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_income'), ''),
        source_row.existing_app_income
      ) AS app_income,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_occ'), ''),
        source_row.existing_app_occ
      ) AS app_occ,
      NULLIF(BTRIM(overrides.data->>'app_oth_occ'), '') AS app_oth_occ,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_pol_conn'), ''),
        source_row.existing_app_pol_conn,
        'NA'
      ) AS app_pol_conn,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_doc_proof'), ''),
        source_row.existing_app_doc_proof
      ) AS app_doc_proof,
      NULL::text AS app_internal_ref,
      NULL::text AS app_branch_code,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_mar_status'), ''),
        source_row.existing_app_mar_status,
        CASE
          WHEN UPPER(COALESCE(source_row.source_marital_status, '')) = 'SINGLE' THEN '01'
          WHEN UPPER(COALESCE(source_row.source_marital_status, '')) = 'MARRIED' THEN '02'
          ELSE NULL
        END
      ) AS app_mar_status,
      NULL::text AS app_netwrth,
      NULL::text AS app_networth_dt,
      NULL::text AS app_incorp_plc,
      NULL::text AS app_otherinfo,
      NULL::text AS app_filler1,
      NULL::text AS app_filler2,
      NULL::text AS app_filler3,
      NULL::text AS app_ipv_name,
      NULL::text AS app_ipv_desg,
      NULL::text AS app_ipv_organ,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_kyc_mode'), ''),
        source_row.existing_app_kyc_mode,
        '5'
      ) AS app_kyc_mode,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_ver_no'), ''),
        source_row.existing_app_ver_no,
        'V28'
      ) AS app_ver_no,
      COALESCE(
        NULLIF(BTRIM(overrides.data->>'app_kra_code'), ''),
        source_row.existing_app_kra_code,
        'CVLKRA'
      ) AS app_kra_code,
      NULL::text AS app_vid_no,
      NULL::text AS app_uid_token,
      NULL::text AS app_auth_name,
      NULL::text AS app_auth_email,
      NULL::text AS app_auth_email1,
      NULL::text AS app_auth_email2,
      NULL::text AS app_auth_mobile,
      NULL::text AS app_auth_fpiconsent,
      NULL::text AS app_auth_uboconsent,
      'N'::text AS app_fatca_applicable_flag,
      CASE
        WHEN UPPER(COALESCE(source_row.source_country_of_birth, '')) IN ('IN', 'IND', 'INDIA')
        THEN 'INDIA'
        ELSE NULL
      END AS app_fatca_birth_place,
      NULL::text AS app_fatca_birth_country,
      CASE
        WHEN UPPER(COALESCE(source_row.source_citizen_of_india, '')) IN ('YES', 'Y', 'TRUE')
          OR UPPER(COALESCE(source_row.source_country_of_birth, '')) IN ('IN', 'IND', 'INDIA')
        THEN 'IN'
        ELSE NULL
      END AS app_fatca_country_res,
      CASE
        WHEN UPPER(COALESCE(source_row.source_citizen_of_india, '')) IN ('YES', 'Y', 'TRUE') THEN 'Y'
        WHEN UPPER(COALESCE(source_row.source_citizen_of_india, '')) IN ('NO', 'N', 'FALSE') THEN 'N'
        ELSE NULL
      END AS app_fatca_country_cityzenship,
      TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY') AS app_fatca_date_declaration,
      CASE
        WHEN source_row.source_mobile_verified IS TRUE THEN 'Y'
        WHEN source_row.source_mobile IS NOT NULL THEN 'N'
        ELSE NULL
      END AS app_mobile_flg,
      CASE
        WHEN source_row.source_email_verified IS TRUE THEN 'Y'
        WHEN source_row.source_email IS NOT NULL THEN 'N'
        ELSE NULL
      END AS app_email_flg,
      NULL::text AS app_otp_refno,
      NULL::text AS app_perm_district,
      NULL::text AS app_corr_district,
      jsonb_build_object(
        'header',
        jsonb_build_object(
          'company_code', COALESCE(
            NULLIF(BTRIM(overrides.data->>'company_code'), ''),
            source_row.existing_company_code,
            NULLIF(BTRIM(overrides.data->>'app_pos_code'), ''),
            source_row.existing_app_pos_code
          ),
          'batch_date', TO_CHAR(CURRENT_DATE, 'DD/MM/YYYY')
        ),
        'source_tables',
        ARRAY[
          'public.kyc_applications',
          'public.identity_verifications',
          'public.pan_verifications',
          'public.contact_details',
          'public.personal_details',
          'public.digilocker_details',
          'public.cvlkra_data'
        ],
        'field_mapping',
        jsonb_build_object(
          'company_code', 'request.body.company_code fallback env.CVL_POSCODE fallback existing cvlkra_data.company_code',
          'app_pos_code', 'request.body.app_pos_code fallback env.CVL_POSCODE fallback existing cvlkra_data.app_pos_code',
          'app_pan_no', 'COALESCE(identity_verifications.pan_number, pan_verifications.pan_number)',
          'app_name', 'COALESCE(identity_verifications.full_name, pan_verifications.full_name, digilocker_details.name)',
          'app_f_name', 'personal_details.father_name fallback digilocker_details.father_name',
          'app_dob_incorp', 'COALESCE(identity_verifications.dob, digilocker_details.dob) -> DD/MM/YYYY',
          'app_gen', 'COALESCE(identity_verifications.gender, personal_details.gender, digilocker_details.gender) -> M/F/T',
          'app_cor_add1', 'COALESCE(identity_verifications.address_1, personal_details.aadhaar_address, digilocker_details.address)',
          'app_cor_city', 'identity_verifications.address_2',
          'app_cor_state', 'identity_verifications.state -> CVLKRA numeric state code',
          'app_cor_pincd', 'identity_verifications.pincode',
          'app_email', 'contact_details.email',
          'app_mob_no', 'contact_details.mobile_number',
          'app_mobile_flg', 'contact_details.mobile_verified -> Y/N',
          'app_email_flg', 'contact_details.email_verified -> Y/N',
          'app_uid_no', 'identity_verifications.aadhaar_number -> last 4 digits when full numeric',
          'app_cor_add_ref', 'identity_verifications.aadhaar_number -> last 4 digits when full numeric',
          'app_per_add_ref', 'identity_verifications.aadhaar_number -> last 4 digits when full numeric'
        ),
        'overrides',
        overrides.data,
        'todo_fields',
        ARRAY[
          'app_updtflg_meaning_needs_cvlkra_business_confirmation',
          'app_exmt_id_proof_is_kept_inside_request_payload_only_and_needs_exact_cvlkra_code_mapping',
          'app_income_needs_exact_cvlkra_income_code_mapping',
          'app_occ_needs_exact_cvlkra_occupation_code_mapping',
          'app_doc_proof_needs_exact_cvlkra_code_mapping',
          'app_cor_add_proof_needs_exact_cvlkra_code_mapping',
          'app_per_add_proof_needs_exact_cvlkra_code_mapping',
          'app_ver_no_defaulted_to_sample_version_until_business_confirms_a_newer_required_value',
          'fatca_fields_are_staged_with_minimal_india_defaults_only'
        ]
      ) AS request_payload
    FROM source_row
    CROSS JOIN overrides
  )
`;

const getCvlkraSourceByApplicationIdQuery = `
  ${buildCvlkraSourceCte()}
  SELECT *
  FROM prepared_row
  WHERE application_id = $1;
`;

const checkCvlkraApplicationIdUniqueIndexQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'cvlkra_data'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'application_id'
  ) AS has_unique_application_id;
`;

const upsertCvlkraDataByApplicationIdQuery = `
  ${buildCvlkraSourceCte()}
  INSERT INTO public.cvlkra_data (
    application_id,
    company_code,
    batch_date,
    app_updtflg,
    app_pos_code,
    app_type,
    app_date,
    app_pan_no,
    app_pan_copy,
    app_exmt,
    app_ipv_flag,
    app_ipv_date,
    app_gen,
    app_name,
    app_f_name,
    app_dob_incorp,
    app_nationality,
    app_res_status,
    app_res_status_proof,
    app_uid_no,
    app_cor_add1,
    app_cor_add2,
    app_cor_add3,
    app_cor_city,
    app_cor_pincd,
    app_cor_state,
    app_cor_ctry,
    app_mob_no,
    app_email,
    app_cor_add_proof,
    app_cor_add_ref,
    app_cor_add_dt,
    app_per_add_flag,
    app_per_add1,
    app_per_add2,
    app_per_add3,
    app_per_city,
    app_per_pincd,
    app_per_state,
    app_per_ctry,
    app_per_add_proof,
    app_per_add_ref,
    app_per_add_dt,
    app_income,
    app_occ,
    app_pol_conn,
    app_doc_proof,
    app_mar_status,
    app_kyc_mode,
    app_ver_no,
    app_kra_code,
    app_fatca_applicable_flag,
    app_fatca_birth_place,
    app_fatca_birth_country,
    app_fatca_country_res,
    app_fatca_country_cityzenship,
    app_fatca_date_declaration,
    app_mobile_flg,
    app_email_flg,
    request_payload,
    updated_at
  )
  SELECT
    application_id,
    company_code,
    batch_date,
    app_updtflg,
    app_pos_code,
    app_type,
    app_date,
    app_pan_no,
    app_pan_copy,
    app_exmt,
    app_ipv_flag,
    app_ipv_date,
    app_gen,
    app_name,
    app_f_name,
    app_dob_incorp,
    app_nationality,
    app_res_status,
    app_res_status_proof,
    app_uid_no,
    app_cor_add1,
    app_cor_add2,
    app_cor_add3,
    app_cor_city,
    app_cor_pincd,
    app_cor_state,
    app_cor_ctry,
    app_mob_no,
    app_email,
    app_cor_add_proof,
    app_cor_add_ref,
    app_cor_add_dt,
    app_per_add_flag,
    app_per_add1,
    app_per_add2,
    app_per_add3,
    app_per_city,
    app_per_pincd,
    app_per_state,
    app_per_ctry,
    app_per_add_proof,
    app_per_add_ref,
    app_per_add_dt,
    app_income,
    app_occ,
    app_pol_conn,
    app_doc_proof,
    app_mar_status,
    app_kyc_mode,
    app_ver_no,
    app_kra_code,
    app_fatca_applicable_flag,
    app_fatca_birth_place,
    app_fatca_birth_country,
    app_fatca_country_res,
    app_fatca_country_cityzenship,
    app_fatca_date_declaration,
    app_mobile_flg,
    app_email_flg,
    request_payload,
    NOW()
  FROM prepared_row
  WHERE application_id = $1
  ON CONFLICT (application_id) DO UPDATE SET
    company_code = EXCLUDED.company_code,
    batch_date = EXCLUDED.batch_date,
    app_updtflg = EXCLUDED.app_updtflg,
    app_pos_code = EXCLUDED.app_pos_code,
    app_type = EXCLUDED.app_type,
    app_date = EXCLUDED.app_date,
    app_pan_no = EXCLUDED.app_pan_no,
    app_pan_copy = EXCLUDED.app_pan_copy,
    app_exmt = EXCLUDED.app_exmt,
    app_ipv_flag = EXCLUDED.app_ipv_flag,
    app_ipv_date = EXCLUDED.app_ipv_date,
    app_gen = EXCLUDED.app_gen,
    app_name = EXCLUDED.app_name,
    app_f_name = EXCLUDED.app_f_name,
    app_dob_incorp = EXCLUDED.app_dob_incorp,
    app_nationality = EXCLUDED.app_nationality,
    app_res_status = EXCLUDED.app_res_status,
    app_res_status_proof = EXCLUDED.app_res_status_proof,
    app_uid_no = EXCLUDED.app_uid_no,
    app_cor_add1 = EXCLUDED.app_cor_add1,
    app_cor_add2 = EXCLUDED.app_cor_add2,
    app_cor_add3 = EXCLUDED.app_cor_add3,
    app_cor_city = EXCLUDED.app_cor_city,
    app_cor_pincd = EXCLUDED.app_cor_pincd,
    app_cor_state = EXCLUDED.app_cor_state,
    app_cor_ctry = EXCLUDED.app_cor_ctry,
    app_mob_no = EXCLUDED.app_mob_no,
    app_email = EXCLUDED.app_email,
    app_cor_add_proof = EXCLUDED.app_cor_add_proof,
    app_cor_add_ref = EXCLUDED.app_cor_add_ref,
    app_cor_add_dt = EXCLUDED.app_cor_add_dt,
    app_per_add_flag = EXCLUDED.app_per_add_flag,
    app_per_add1 = EXCLUDED.app_per_add1,
    app_per_add2 = EXCLUDED.app_per_add2,
    app_per_add3 = EXCLUDED.app_per_add3,
    app_per_city = EXCLUDED.app_per_city,
    app_per_pincd = EXCLUDED.app_per_pincd,
    app_per_state = EXCLUDED.app_per_state,
    app_per_ctry = EXCLUDED.app_per_ctry,
    app_per_add_proof = EXCLUDED.app_per_add_proof,
    app_per_add_ref = EXCLUDED.app_per_add_ref,
    app_per_add_dt = EXCLUDED.app_per_add_dt,
    app_income = EXCLUDED.app_income,
    app_occ = EXCLUDED.app_occ,
    app_pol_conn = EXCLUDED.app_pol_conn,
    app_doc_proof = EXCLUDED.app_doc_proof,
    app_mar_status = EXCLUDED.app_mar_status,
    app_kyc_mode = EXCLUDED.app_kyc_mode,
    app_ver_no = EXCLUDED.app_ver_no,
    app_kra_code = EXCLUDED.app_kra_code,
    app_fatca_applicable_flag = EXCLUDED.app_fatca_applicable_flag,
    app_fatca_birth_place = EXCLUDED.app_fatca_birth_place,
    app_fatca_birth_country = EXCLUDED.app_fatca_birth_country,
    app_fatca_country_res = EXCLUDED.app_fatca_country_res,
    app_fatca_country_cityzenship = EXCLUDED.app_fatca_country_cityzenship,
    app_fatca_date_declaration = EXCLUDED.app_fatca_date_declaration,
    app_mobile_flg = EXCLUDED.app_mobile_flg,
    app_email_flg = EXCLUDED.app_email_flg,
    request_payload = EXCLUDED.request_payload,
    updated_at = NOW()
  RETURNING id, application_id;
`;

module.exports = {
  getCvlkraSourceByApplicationIdQuery,
  checkCvlkraApplicationIdUniqueIndexQuery,
  upsertCvlkraDataByApplicationIdQuery,
};
const { normalizeDateForPostgres } = require("../utils/normalizeDateForPostgres");
