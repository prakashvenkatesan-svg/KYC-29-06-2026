const buildCdslStateSubdivisionCodeCase = (fieldName) => `
  CASE
    WHEN UPPER(${fieldName}) = 'ANDHRA PRADESH' THEN 'IN-AP'
    WHEN UPPER(${fieldName}) = 'ARUNACHAL PRADESH' THEN 'IN-AR'
    WHEN UPPER(${fieldName}) = 'ASSAM' THEN 'IN-AS'
    WHEN UPPER(${fieldName}) = 'BIHAR' THEN 'IN-BR'
    WHEN UPPER(${fieldName}) = 'CHHATTISGARH' THEN 'IN-CG'
    WHEN UPPER(${fieldName}) IN ('GOA') THEN 'IN-GA'
    WHEN UPPER(${fieldName}) = 'GUJARAT' THEN 'IN-GJ'
    WHEN UPPER(${fieldName}) = 'HARYANA' THEN 'IN-HR'
    WHEN UPPER(${fieldName}) = 'HIMACHAL PRADESH' THEN 'IN-HP'
    WHEN UPPER(${fieldName}) IN ('JAMMU & KASHMIR', 'JAMMU AND KASHMIR') THEN 'IN-JK'
    WHEN UPPER(${fieldName}) = 'JHARKHAND' THEN 'IN-JH'
    WHEN UPPER(${fieldName}) = 'KARNATAKA' THEN 'IN-KA'
    WHEN UPPER(${fieldName}) = 'KERALA' THEN 'IN-KL'
    WHEN UPPER(${fieldName}) IN ('MADHYA PRADESH') THEN 'IN-MP'
    WHEN UPPER(${fieldName}) = 'MAHARASHTRA' THEN 'IN-MH'
    WHEN UPPER(${fieldName}) = 'MANIPUR' THEN 'IN-MN'
    WHEN UPPER(${fieldName}) = 'MEGHALAYA' THEN 'IN-ML'
    WHEN UPPER(${fieldName}) = 'MIZORAM' THEN 'IN-MZ'
    WHEN UPPER(${fieldName}) = 'NAGALAND' THEN 'IN-NL'
    WHEN UPPER(${fieldName}) IN ('ODISHA', 'ORISSA') THEN 'IN-OD'
    WHEN UPPER(${fieldName}) = 'PUNJAB' THEN 'IN-PB'
    WHEN UPPER(${fieldName}) = 'RAJASTHAN' THEN 'IN-RJ'
    WHEN UPPER(${fieldName}) = 'SIKKIM' THEN 'IN-SK'
    WHEN UPPER(${fieldName}) = 'TAMIL NADU' THEN 'IN-TN'
    WHEN UPPER(${fieldName}) = 'TELANGANA' THEN 'IN-TS'
    WHEN UPPER(${fieldName}) = 'TRIPURA' THEN 'IN-TR'
    WHEN UPPER(${fieldName}) = 'UTTAR PRADESH' THEN 'IN-UP'
    WHEN UPPER(${fieldName}) IN ('UTTARAKHAND', 'UTTARANCHAL') THEN 'IN-UK'
    WHEN UPPER(${fieldName}) = 'WEST BENGAL' THEN 'IN-WB'
    WHEN UPPER(${fieldName}) IN ('ANDAMAN & NICOBAR ISLANDS', 'ANDAMAN AND NICOBAR ISLANDS') THEN 'IN-AN'
    WHEN UPPER(${fieldName}) = 'CHANDIGARH' THEN 'IN-CH'
    WHEN UPPER(${fieldName}) IN ('DADRA & NAGAR HAVELI AND DAMAN & DIU', 'DADRA AND NAGAR HAVELI AND DAMAN AND DIU') THEN 'IN-DH'
    WHEN UPPER(${fieldName}) IN ('DELHI', 'NEW DELHI') THEN 'IN-DL'
    WHEN UPPER(${fieldName}) = 'LADAKH' THEN 'IN-LA'
    WHEN UPPER(${fieldName}) = 'LAKSHADWEEP' THEN 'IN-LD'
    WHEN UPPER(${fieldName}) IN ('PUDUCHERRY', 'PONDICHERRY') THEN 'IN-PY'
    WHEN ${fieldName} IS NOT NULL AND ${fieldName} ~ '^IN-[A-Z0-9]{2,3}$' THEN UPPER(${fieldName})
    ELSE NULL
  END
`;

const buildCdslGenderCodeCase = (fieldName) => `
  CASE
    WHEN UPPER(COALESCE(${fieldName}, '')) IN ('MALE', 'M') THEN 'M'
    WHEN UPPER(COALESCE(${fieldName}, '')) IN ('FEMALE', 'F') THEN 'F'
    WHEN UPPER(COALESCE(${fieldName}, '')) IN ('OTHER', 'O', 'TRANSGENDER', 'T', 'THIRD GENDER') THEN 'O'
    ELSE NULL
  END
`;

const buildCdslSourceCte = () => `
  WITH latest_identity AS (
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
      iv.aadhaar_number
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
      pv.first_name,
      pv.middle_name,
      pv.last_name,
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
      cd.mobile_number
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
      pd.annual_income,
      pd.occupation,
      pd.country_of_birth,
      pd.citizen_of_india,
      pd.ddpi,
      pd.aadhaar_address
    FROM public.personal_details pd
    WHERE pd.application_id = $1
    ORDER BY pd.updated_at DESC NULLS LAST, pd.id DESC
    LIMIT 1
  ),
  latest_bank AS (
    SELECT
      bd.application_id,
      bd.account_number,
      bd.ifsc_code,
      bd.account_type,
      bd.bank_name
    FROM public.bank_details bd
    WHERE bd.application_id = $1
    ORDER BY bd.updated_at DESC NULLS LAST, bd.id DESC
    LIMIT 1
  ),
  latest_digilocker AS (
    SELECT
      dd.application_id,
      dd.provider,
      dd.name,
      dd.address
    FROM public.digilocker_details dd
    WHERE dd.application_id = $1::text
    ORDER BY dd.updated_at DESC NULLS LAST, dd.id DESC
    LIMIT 1
  ),
  nominee_presence AS (
    SELECT
      nd.application_id,
      COUNT(*)::integer AS nominee_count
    FROM public.nominee_details nd
    WHERE nd.application_id = $1
    GROUP BY nd.application_id
  ),
  source_row AS (
    SELECT
      ka.id AS application_id,
      NULLIF(BTRIM(ka.boid), '') AS source_boid,
      NULLIF(BTRIM(COALESCE(li.pan_number, lpv.pan_number)), '') AS source_pan_number,
      li.dob AS source_dob,
      NULLIF(BTRIM(COALESCE(li.full_name, lpv.full_name, ld.name)), '') AS source_full_name,
      NULLIF(BTRIM(lpv.first_name), '') AS source_first_name,
      NULLIF(BTRIM(lpv.middle_name), '') AS source_middle_name,
      NULLIF(BTRIM(lpv.last_name), '') AS source_last_name,
      NULLIF(BTRIM(COALESCE(li.address_1, lp.aadhaar_address, ld.address)), '') AS source_address_text,
      NULLIF(BTRIM(li.address_2), '') AS source_city,
      NULLIF(BTRIM(li.state), '') AS source_state,
      NULLIF(BTRIM(li.pincode), '') AS source_pincode,
      NULLIF(BTRIM(COALESCE(lp.father_name, '')), '') AS source_father_name,
      NULLIF(BTRIM(COALESCE(li.gender, lp.gender)), '') AS source_gender,
      NULLIF(BTRIM(lp.occupation), '') AS source_occupation,
      NULLIF(BTRIM(lp.annual_income), '') AS source_annual_income,
      NULLIF(BTRIM(lp.country_of_birth), '') AS source_country_of_birth,
      NULLIF(BTRIM(lp.citizen_of_india), '') AS source_citizen_of_india,
      CASE
        WHEN li.aadhaar_number ~ '^[0-9]{12}$' THEN li.aadhaar_number
        ELSE NULL
      END AS source_aadhaar_number,
      NULLIF(BTRIM(lc.email), '') AS source_email,
      NULLIF(BTRIM(lc.mobile_number), '') AS source_mobile,
      NULLIF(BTRIM(lb.account_number), '') AS source_bank_account_number,
      NULLIF(BTRIM(lb.ifsc_code), '') AS source_bank_ifsc,
      NULLIF(BTRIM(lb.account_type), '') AS source_bank_account_type,
      NULLIF(BTRIM(lb.bank_name), '') AS source_bank_name,
      NULLIF(BTRIM(lp.ddpi), '') AS source_ddpi,
      COALESCE(np.nominee_count, 0) AS source_nominee_count,
      existing.dpid AS existing_dpid,
      existing.operator_id AS existing_operator_id,
      existing.product_number AS existing_product_number,
      existing.annual_income_code AS existing_annual_income_code,
      existing.bo_category AS existing_bo_category,
      existing.bo_settlement_planning_flag AS existing_bo_settlement_planning_flag,
      existing.bo_sub_status AS existing_bo_sub_status,
      existing.bo_statement_cycle_code AS existing_bo_statement_cycle_code,
      existing.dividend_bank_acct_type AS existing_dividend_bank_acct_type,
      existing.dividend_bank_code AS existing_dividend_bank_code,
      existing.dividend_bank_ccy AS existing_dividend_bank_ccy,
      existing.pan_verification_flag AS existing_pan_verification_flag,
      existing.signature_file_flag AS existing_signature_file_flag,
      existing.beneficiary_tax_deduction_status AS existing_beneficiary_tax_deduction_status,
      existing.nomination_opt_out AS existing_nomination_opt_out,
      existing.uid_verification_flag AS existing_uid_verification_flag,
      existing.poa_type_flag AS existing_poa_type_flag,
      existing.bo_fee_type AS existing_bo_fee_type,
      existing.nationality_code AS existing_nationality_code,
      existing.bonafide_flag AS existing_bonafide_flag,
      existing.email_statement_flag AS existing_email_statement_flag,
      existing.annual_report_flag AS existing_annual_report_flag,
      existing.bsda_flag AS existing_bsda_flag,
      existing.communication_preference AS existing_communication_preference
    FROM public.kyc_applications ka
    LEFT JOIN latest_identity li
      ON li.application_id = ka.id
    LEFT JOIN latest_pan_verification lpv
      ON lpv.application_id = ka.id::text
    LEFT JOIN latest_contact lc
      ON lc.application_id = ka.id
    LEFT JOIN latest_personal lp
      ON lp.application_id = ka.id
    LEFT JOIN latest_bank lb
      ON lb.application_id = ka.id
    LEFT JOIN latest_digilocker ld
      ON ld.application_id = ka.id::text
    LEFT JOIN nominee_presence np
      ON np.application_id = ka.id
    LEFT JOIN public.cdsl_data existing
      ON existing.application_id = ka.id
    WHERE ka.id = $1
  ),
  prepared_row AS (
    SELECT
      source_row.application_id,
      '08'::varchar AS upload_id,
      COALESCE(NULLIF($2, ''), source_row.existing_dpid) AS dpid,
      -- TODO: Operator ID is CDSL participant metadata and is not stored in current KYC tables.
      COALESCE(NULLIF($3, ''), source_row.existing_operator_id) AS operator_id,
      CASE
        WHEN source_row.source_boid ~ '^[0-9]{16}$' THEN source_row.source_boid
        ELSE NULL
      END AS bo_id,
      TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') AS bo_request_receive_date,
      -- TODO: Product number is CDSL BO master metadata and is not stored in current KYC tables.
      COALESCE(NULLIF($4, ''), source_row.existing_product_number) AS product_number,
      COALESCE(
        source_row.source_first_name,
        NULLIF(SPLIT_PART(source_row.source_full_name, ' ', 1), '')
      ) AS bo_name,
      COALESCE(
        source_row.source_middle_name,
        NULLIF(
          BTRIM(
            REGEXP_REPLACE(
              source_row.source_full_name,
              '^[^ ]+\\s*|\\s*[^ ]+$',
              '',
              'g'
            )
          ),
          ''
        )
      ) AS bo_middle_name,
      COALESCE(
        source_row.source_last_name,
        NULLIF(
          CASE
            WHEN POSITION(' ' IN source_row.source_full_name) > 0
            THEN REGEXP_REPLACE(source_row.source_full_name, '^.*\\s', '')
            ELSE NULL
          END,
          ''
        )
      ) AS last_name,
      NULL::varchar AS bo_title,
      NULL::varchar AS bo_suffix,
      source_row.source_father_name AS father_husband_name,
      NULLIF(BTRIM(SUBSTRING(COALESCE(source_row.source_address_text, '') FROM 1 FOR 55)), '') AS cust_addr_1,
      NULLIF(BTRIM(SUBSTRING(COALESCE(source_row.source_address_text, '') FROM 56 FOR 55)), '') AS cust_addr_2,
      NULLIF(BTRIM(SUBSTRING(COALESCE(source_row.source_address_text, '') FROM 111 FOR 55)), '') AS cust_addr_3,
      CASE
        WHEN source_row.source_address_text IS NOT NULL THEN 'IN'
        ELSE NULL
      END AS cust_addr_cntry_code,
      source_row.source_pincode AS cust_addr_zip,
      ${buildCdslStateSubdivisionCodeCase("source_row.source_state")} AS cust_addr_state_code,
      CASE
        WHEN source_row.source_address_text IS NOT NULL
          AND ${buildCdslStateSubdivisionCodeCase("source_row.source_state")} IS NULL
        THEN source_row.source_state
        ELSE NULL
      END AS cust_addr_state,
      source_row.source_city AS cust_addr_city,
      CASE
        WHEN source_row.source_city IS NOT NULL THEN '00'
        ELSE NULL
      END AS city_sequence_number,
      CASE
        WHEN source_row.source_mobile IS NOT NULL THEN '91'
        ELSE NULL
      END AS primary_mobile_no_isd_code,
      source_row.source_mobile AS primary_mobile_no,
      NULL::varchar AS secondary_isd_code,
      NULL::varchar AS secondary_mobile_phone,
      NULL::varchar AS secondary_email,
      NULL::varchar AS cust_fax,
      source_row.source_pan_number AS income_tax_pan,
      CASE
        WHEN source_row.source_aadhaar_number IS NOT NULL
          AND LENGTH(source_row.source_aadhaar_number) <= 16
        THEN source_row.source_aadhaar_number
        ELSE NULL
      END AS uid,
      COALESCE(NULLIF($17, ''), source_row.existing_uid_verification_flag) AS uid_verification_flag,
      CASE
        WHEN UPPER(COALESCE(source_row.source_ddpi, '')) IN ('YES', 'Y', 'TRUE') THEN 'D'
        ELSE COALESCE(NULLIF($18, ''), source_row.existing_poa_type_flag)
      END AS poa_type_flag,
      NULL::varchar AS filler1,
      NULL::varchar AS it_circle,
      source_row.source_email AS primary_email,
      NULL::varchar AS lei,
      NULL::varchar AS user_text_1,
      NULL::varchar AS user_text_2,
      NULL::varchar AS pan_exemption_code,
      -- TODO: PAN verification flag requires CDSL-specific confirmation and is not stored in current KYC tables.
      COALESCE(NULLIF($13, ''), source_row.existing_pan_verification_flag) AS pan_verification_flag,
      COALESCE(NULLIF($14, ''), source_row.existing_signature_file_flag) AS signature_file_flag,
      TO_CHAR(source_row.source_dob, 'DDMMYYYY') AS date_of_birth_or_origin,
      ${buildCdslGenderCodeCase("source_row.source_gender")} AS sex_code,
      NULL::varchar AS occupation,
      NULL::varchar AS life_style,
      NULL::varchar AS geographical_code,
      NULL::varchar AS education_degree,
      -- TODO: Annual income code requires CDSL-specific coding and is not stored in current KYC tables.
      COALESCE(NULLIF($5, ''), source_row.existing_annual_income_code) AS annual_income_code,
      CASE
        WHEN UPPER(COALESCE(source_row.source_citizen_of_india, '')) IN ('YES', 'Y', 'TRUE')
          OR UPPER(COALESCE(source_row.source_country_of_birth, '')) IN ('IN', 'IND', 'INDIA')
        THEN 'IND'
        ELSE COALESCE(NULLIF($20, ''), source_row.existing_nationality_code)
      END AS nationality_code,
      COALESCE(NULLIF($19, ''), source_row.existing_bo_fee_type) AS bo_fee_type,
      NULL::varchar AS language_code,
      NULL::varchar AS category_4_code,
      NULL::varchar AS bank_option_5,
      NULL::varchar AS staff_relative,
      NULL::varchar AS staff_code,
      CASE
        WHEN source_row.source_nominee_count > 0 THEN 'N'
        WHEN source_row.source_nominee_count = 0 THEN 'Y'
        ELSE COALESCE(NULLIF($16, ''), source_row.existing_nomination_opt_out)
      END AS nomination_opt_out,
      COALESCE(NULLIF($21, ''), source_row.existing_bonafide_flag) AS bonafide_flag,
      COALESCE(NULLIF($22, ''), source_row.existing_email_statement_flag) AS email_statement_flag,
      NULL::varchar AS cas_mode,
      NULL::varchar AS mental_disability,
      NULL::varchar AS rgess_flag,
      COALESCE(NULLIF($23, ''), source_row.existing_annual_report_flag) AS annual_report_flag,
      NULL::varchar AS pledge_standing_instruction_flag,
      NULL::varchar AS email_rta_download_flag,
      COALESCE(NULLIF($24, ''), source_row.existing_bsda_flag) AS bsda_flag,
      CASE
        WHEN source_row.source_nominee_count >= 0 THEN '0'
        ELSE NULL
      END AS mode_of_operation,
      COALESCE(NULLIF($25, ''), source_row.existing_communication_preference) AS communication_preference,
      NULL::varchar AS security_access_code,
      -- TODO: BO category requires CDSL-specific coding and is not stored in current KYC tables.
      COALESCE(NULLIF($6, ''), source_row.existing_bo_category) AS bo_category,
      -- TODO: BO settlement planning flag requires participant-side business default.
      COALESCE(NULLIF($7, ''), source_row.existing_bo_settlement_planning_flag) AS bo_settlement_planning_flag,
      source_row.source_bank_ifsc AS dividend_bank_ifsc_code,
      NULL::varchar AS rbi_reference_number,
      NULL::varchar AS rbi_approval_date,
      NULL::varchar AS sebi_registration_number,
      COALESCE(
        NULLIF($15, ''),
        source_row.existing_beneficiary_tax_deduction_status,
        '01'
      ) AS beneficiary_tax_deduction_status,
      NULL::varchar AS smart_card_required,
      NULL::varchar AS smart_card_number,
      NULL::varchar AS smart_card_pin,
      NULL::varchar AS ecs_mandate,
      NULL::varchar AS electronic_confirmation,
      NULL::varchar AS dividend_currency,
      NULL::varchar AS group_code,
      -- TODO: BO sub status requires CDSL-specific coding and is not stored in current KYC tables.
      COALESCE(NULLIF($8, ''), source_row.existing_bo_sub_status) AS bo_sub_status,
      NULL::varchar AS clearing_corporation_id,
      NULL::varchar AS clearing_member_id,
      NULL::varchar AS stock_exchange,
      NULL::varchar AS confirmation_waived,
      NULL::varchar AS trading_id,
      -- TODO: BO statement cycle code requires CDSL-specific coding and is not stored in current KYC tables.
      COALESCE(NULLIF($9, ''), source_row.existing_bo_statement_cycle_code) AS bo_statement_cycle_code,
      NULL::varchar AS custodian_pms_email_id,
      -- TODO: Dividend bank account type requires CDSL-specific value and is not stored in current KYC tables.
      COALESCE(NULLIF($10, ''), source_row.existing_dividend_bank_acct_type) AS dividend_bank_acct_type,
      -- TODO: Dividend bank code is not stored in current KYC tables.
      COALESCE(NULLIF($11, ''), source_row.existing_dividend_bank_code) AS dividend_bank_code,
      source_row.source_bank_account_number AS dividend_acct_numb,
      -- TODO: Dividend bank currency requires CDSL-specific value and is not stored in current KYC tables.
      COALESCE(NULLIF($12, ''), source_row.existing_dividend_bank_ccy) AS dividend_bank_ccy,
      jsonb_build_object(
        'source_tables',
        ARRAY[
          'public.kyc_applications',
          'public.identity_verifications',
          'public.pan_verifications',
          'public.contact_details',
          'public.personal_details',
          'public.bank_details',
          'public.digilocker_details',
          'public.nominee_details',
          'public.cdsl_data'
        ],
        'api_transport',
        jsonb_build_object(
          'upload_id', '08',
          'setup_upload_endpoint', 'https://apigt.cdsl.co.in/Commonweb/api/BOAPI/HrmSetUpload',
          'modify_upload_endpoint', 'https://apigt.cdsl.co.in/Commonweb/api/BOAPI/HrmModUpload'
        ),
        'field_mapping',
        jsonb_build_object(
          'application_id', 'kyc_applications.id',
          'bo_id', 'kyc_applications.boid when 16-digit',
          'bo_name', 'pan_verifications.first_name fallback split from applicant full name',
          'bo_middle_name', 'pan_verifications.middle_name fallback split from applicant full name',
          'last_name', 'pan_verifications.last_name fallback split from applicant full name',
          'father_husband_name', 'personal_details.father_name',
          'cust_addr_1_to_3', 'best available current address string split into 55-char chunks',
          'cust_addr_state_code', 'identity_verifications.state -> ISO 3166-2 code',
          'cust_addr_city', 'identity_verifications.address_2',
          'primary_mobile_no', 'contact_details.mobile_number',
          'income_tax_pan', 'COALESCE(identity_verifications.pan_number, pan_verifications.pan_number)',
          'uid', 'identity_verifications.aadhaar_number when fully numeric and unmasked',
          'primary_email', 'contact_details.email',
          'date_of_birth_or_origin', 'identity_verifications.dob -> DDMMYYYY',
          'sex_code', 'COALESCE(identity_verifications.gender, personal_details.gender) -> M/F/O',
          'dividend_bank_ifsc_code', 'bank_details.ifsc_code',
          'dividend_acct_numb', 'bank_details.account_number',
          'nomination_opt_out', 'derived from nominee_details row presence',
          'poa_type_flag', 'derived D for DDPI when personal_details.ddpi is yes else override'
        ),
        'todo_fields',
        ARRAY[
          'operator_id',
          'product_number',
          'annual_income_code',
          'bo_category',
          'bo_settlement_planning_flag',
          'bo_sub_status',
          'bo_statement_cycle_code',
          'dividend_bank_acct_type',
          'dividend_bank_code',
          'dividend_bank_ccy',
          'pan_verification_flag',
          'signature_file_flag'
        ]
      ) AS request_payload
    FROM source_row
  )
`;

const getCdslSourceByApplicationIdQuery = `
  ${buildCdslSourceCte()}
  SELECT *
  FROM prepared_row
  WHERE application_id = $1;
`;

const checkCdslApplicationIdUniqueIndexQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'cdsl_data'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'application_id'
  ) AS has_unique_application_id;
`;

const upsertCdslDataByApplicationIdQuery = `
  ${buildCdslSourceCte()}
  INSERT INTO public.cdsl_data (
    application_id,
    upload_id,
    dpid,
    operator_id,
    bo_id,
    bo_request_receive_date,
    product_number,
    bo_name,
    bo_middle_name,
    last_name,
    bo_title,
    bo_suffix,
    father_husband_name,
    cust_addr_1,
    cust_addr_2,
    cust_addr_3,
    cust_addr_cntry_code,
    cust_addr_zip,
    cust_addr_state_code,
    cust_addr_state,
    cust_addr_city,
    city_sequence_number,
    primary_mobile_no_isd_code,
    primary_mobile_no,
    secondary_isd_code,
    secondary_mobile_phone,
    secondary_email,
    cust_fax,
    income_tax_pan,
    uid,
    uid_verification_flag,
    poa_type_flag,
    filler1,
    it_circle,
    primary_email,
    lei,
    user_text_1,
    user_text_2,
    pan_exemption_code,
    pan_verification_flag,
    signature_file_flag,
    date_of_birth_or_origin,
    sex_code,
    occupation,
    life_style,
    geographical_code,
    education_degree,
    annual_income_code,
    nationality_code,
    bo_fee_type,
    language_code,
    category_4_code,
    bank_option_5,
    staff_relative,
    staff_code,
    nomination_opt_out,
    bonafide_flag,
    email_statement_flag,
    cas_mode,
    mental_disability,
    rgess_flag,
    annual_report_flag,
    pledge_standing_instruction_flag,
    email_rta_download_flag,
    bsda_flag,
    mode_of_operation,
    communication_preference,
    security_access_code,
    bo_category,
    bo_settlement_planning_flag,
    dividend_bank_ifsc_code,
    rbi_reference_number,
    rbi_approval_date,
    sebi_registration_number,
    beneficiary_tax_deduction_status,
    smart_card_required,
    smart_card_number,
    smart_card_pin,
    ecs_mandate,
    electronic_confirmation,
    dividend_currency,
    group_code,
    bo_sub_status,
    clearing_corporation_id,
    clearing_member_id,
    stock_exchange,
    confirmation_waived,
    trading_id,
    bo_statement_cycle_code,
    custodian_pms_email_id,
    dividend_bank_acct_type,
    dividend_bank_code,
    dividend_acct_numb,
    dividend_bank_ccy,
    request_payload,
    updated_at
  )
  SELECT
    application_id,
    upload_id,
    dpid,
    operator_id,
    bo_id,
    bo_request_receive_date,
    product_number,
    bo_name,
    bo_middle_name,
    last_name,
    bo_title,
    bo_suffix,
    father_husband_name,
    cust_addr_1,
    cust_addr_2,
    cust_addr_3,
    cust_addr_cntry_code,
    cust_addr_zip,
    cust_addr_state_code,
    cust_addr_state,
    cust_addr_city,
    city_sequence_number,
    primary_mobile_no_isd_code,
    primary_mobile_no,
    secondary_isd_code,
    secondary_mobile_phone,
    secondary_email,
    cust_fax,
    income_tax_pan,
    uid,
    uid_verification_flag,
    poa_type_flag,
    filler1,
    it_circle,
    primary_email,
    lei,
    user_text_1,
    user_text_2,
    pan_exemption_code,
    pan_verification_flag,
    signature_file_flag,
    date_of_birth_or_origin,
    sex_code,
    occupation,
    life_style,
    geographical_code,
    education_degree,
    annual_income_code,
    nationality_code,
    bo_fee_type,
    language_code,
    category_4_code,
    bank_option_5,
    staff_relative,
    staff_code,
    nomination_opt_out,
    bonafide_flag,
    email_statement_flag,
    cas_mode,
    mental_disability,
    rgess_flag,
    annual_report_flag,
    pledge_standing_instruction_flag,
    email_rta_download_flag,
    bsda_flag,
    mode_of_operation,
    communication_preference,
    security_access_code,
    bo_category,
    bo_settlement_planning_flag,
    dividend_bank_ifsc_code,
    rbi_reference_number,
    rbi_approval_date,
    sebi_registration_number,
    beneficiary_tax_deduction_status,
    smart_card_required,
    smart_card_number,
    smart_card_pin,
    ecs_mandate,
    electronic_confirmation,
    dividend_currency,
    group_code,
    bo_sub_status,
    clearing_corporation_id,
    clearing_member_id,
    stock_exchange,
    confirmation_waived,
    trading_id,
    bo_statement_cycle_code,
    custodian_pms_email_id,
    dividend_bank_acct_type,
    dividend_bank_code,
    dividend_acct_numb,
    dividend_bank_ccy,
    request_payload,
    NOW()
  FROM prepared_row
  WHERE application_id = $1
  ON CONFLICT (application_id) DO UPDATE SET
    upload_id = EXCLUDED.upload_id,
    dpid = EXCLUDED.dpid,
    operator_id = EXCLUDED.operator_id,
    bo_id = EXCLUDED.bo_id,
    bo_request_receive_date = EXCLUDED.bo_request_receive_date,
    product_number = EXCLUDED.product_number,
    bo_name = EXCLUDED.bo_name,
    bo_middle_name = EXCLUDED.bo_middle_name,
    last_name = EXCLUDED.last_name,
    bo_title = EXCLUDED.bo_title,
    bo_suffix = EXCLUDED.bo_suffix,
    father_husband_name = EXCLUDED.father_husband_name,
    cust_addr_1 = EXCLUDED.cust_addr_1,
    cust_addr_2 = EXCLUDED.cust_addr_2,
    cust_addr_3 = EXCLUDED.cust_addr_3,
    cust_addr_cntry_code = EXCLUDED.cust_addr_cntry_code,
    cust_addr_zip = EXCLUDED.cust_addr_zip,
    cust_addr_state_code = EXCLUDED.cust_addr_state_code,
    cust_addr_state = EXCLUDED.cust_addr_state,
    cust_addr_city = EXCLUDED.cust_addr_city,
    city_sequence_number = EXCLUDED.city_sequence_number,
    primary_mobile_no_isd_code = EXCLUDED.primary_mobile_no_isd_code,
    primary_mobile_no = EXCLUDED.primary_mobile_no,
    secondary_isd_code = EXCLUDED.secondary_isd_code,
    secondary_mobile_phone = EXCLUDED.secondary_mobile_phone,
    secondary_email = EXCLUDED.secondary_email,
    cust_fax = EXCLUDED.cust_fax,
    income_tax_pan = EXCLUDED.income_tax_pan,
    uid = EXCLUDED.uid,
    uid_verification_flag = EXCLUDED.uid_verification_flag,
    poa_type_flag = EXCLUDED.poa_type_flag,
    filler1 = EXCLUDED.filler1,
    it_circle = EXCLUDED.it_circle,
    primary_email = EXCLUDED.primary_email,
    lei = EXCLUDED.lei,
    user_text_1 = EXCLUDED.user_text_1,
    user_text_2 = EXCLUDED.user_text_2,
    pan_exemption_code = EXCLUDED.pan_exemption_code,
    pan_verification_flag = EXCLUDED.pan_verification_flag,
    signature_file_flag = EXCLUDED.signature_file_flag,
    date_of_birth_or_origin = EXCLUDED.date_of_birth_or_origin,
    sex_code = EXCLUDED.sex_code,
    occupation = EXCLUDED.occupation,
    life_style = EXCLUDED.life_style,
    geographical_code = EXCLUDED.geographical_code,
    education_degree = EXCLUDED.education_degree,
    annual_income_code = EXCLUDED.annual_income_code,
    nationality_code = EXCLUDED.nationality_code,
    bo_fee_type = EXCLUDED.bo_fee_type,
    language_code = EXCLUDED.language_code,
    category_4_code = EXCLUDED.category_4_code,
    bank_option_5 = EXCLUDED.bank_option_5,
    staff_relative = EXCLUDED.staff_relative,
    staff_code = EXCLUDED.staff_code,
    nomination_opt_out = EXCLUDED.nomination_opt_out,
    bonafide_flag = EXCLUDED.bonafide_flag,
    email_statement_flag = EXCLUDED.email_statement_flag,
    cas_mode = EXCLUDED.cas_mode,
    mental_disability = EXCLUDED.mental_disability,
    rgess_flag = EXCLUDED.rgess_flag,
    annual_report_flag = EXCLUDED.annual_report_flag,
    pledge_standing_instruction_flag = EXCLUDED.pledge_standing_instruction_flag,
    email_rta_download_flag = EXCLUDED.email_rta_download_flag,
    bsda_flag = EXCLUDED.bsda_flag,
    mode_of_operation = EXCLUDED.mode_of_operation,
    communication_preference = EXCLUDED.communication_preference,
    security_access_code = EXCLUDED.security_access_code,
    bo_category = EXCLUDED.bo_category,
    bo_settlement_planning_flag = EXCLUDED.bo_settlement_planning_flag,
    dividend_bank_ifsc_code = EXCLUDED.dividend_bank_ifsc_code,
    rbi_reference_number = EXCLUDED.rbi_reference_number,
    rbi_approval_date = EXCLUDED.rbi_approval_date,
    sebi_registration_number = EXCLUDED.sebi_registration_number,
    beneficiary_tax_deduction_status = EXCLUDED.beneficiary_tax_deduction_status,
    smart_card_required = EXCLUDED.smart_card_required,
    smart_card_number = EXCLUDED.smart_card_number,
    smart_card_pin = EXCLUDED.smart_card_pin,
    ecs_mandate = EXCLUDED.ecs_mandate,
    electronic_confirmation = EXCLUDED.electronic_confirmation,
    dividend_currency = EXCLUDED.dividend_currency,
    group_code = EXCLUDED.group_code,
    bo_sub_status = EXCLUDED.bo_sub_status,
    clearing_corporation_id = EXCLUDED.clearing_corporation_id,
    clearing_member_id = EXCLUDED.clearing_member_id,
    stock_exchange = EXCLUDED.stock_exchange,
    confirmation_waived = EXCLUDED.confirmation_waived,
    trading_id = EXCLUDED.trading_id,
    bo_statement_cycle_code = EXCLUDED.bo_statement_cycle_code,
    custodian_pms_email_id = EXCLUDED.custodian_pms_email_id,
    dividend_bank_acct_type = EXCLUDED.dividend_bank_acct_type,
    dividend_bank_code = EXCLUDED.dividend_bank_code,
    dividend_acct_numb = EXCLUDED.dividend_acct_numb,
    dividend_bank_ccy = EXCLUDED.dividend_bank_ccy,
    request_payload = EXCLUDED.request_payload,
    updated_at = NOW()
  RETURNING id, application_id;
`;

module.exports = {
  getCdslSourceByApplicationIdQuery,
  checkCdslApplicationIdUniqueIndexQuery,
  upsertCdslDataByApplicationIdQuery,
};
