const DEFAULT_BSE_DEPOSITORY_PARTICIPANT_1 =
  process.env.BSE_DEPOSITORY_PARTICIPANT_1 ||
  "AIONION CAPITAL MARKET SERVICES PRIVATE LIMITED";

const buildBseSourceCte = () => `
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
      pd.gender,
      pd.annual_income,
      pd.net_worth,
      pd.politically_exposed,
      pd.occupation,
      pd.country_of_birth,
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
      dd.address,
      dd.aadhaar_number_masked
    FROM public.digilocker_details dd
    WHERE dd.application_id = $1::text
    ORDER BY dd.updated_at DESC NULLS LAST, dd.id DESC
    LIMIT 1
  ),
  latest_client_code AS (
    SELECT
      cc.client_code
    FROM public.client_codes cc
    LEFT JOIN latest_contact lc
      ON TRUE
    LEFT JOIN latest_identity li
      ON TRUE
    LEFT JOIN latest_pan_verification lpv
      ON TRUE
    WHERE (
      NULLIF(BTRIM(COALESCE(lc.email, '')), '') IS NOT NULL
      AND LOWER(BTRIM(COALESCE(cc.email, ''))) = LOWER(BTRIM(lc.email))
    )
      OR (
        NULLIF(BTRIM(COALESCE(li.pan_number, lpv.pan_number, '')), '') IS NOT NULL
        AND UPPER(BTRIM(COALESCE(cc.pan_number, ''))) = UPPER(
          BTRIM(COALESCE(li.pan_number, lpv.pan_number))
        )
      )
    ORDER BY cc.created_at DESC NULLS LAST, cc.id DESC
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
      TO_CHAR(COALESCE(ka.created_at::date, CURRENT_DATE), 'DD/MM/YYYY') AS source_application_date,
      NULLIF(BTRIM(lc.email), '') AS source_email,
      NULLIF(BTRIM(lc.mobile_number), '') AS source_mobile,
      NULLIF(BTRIM(COALESCE(li.pan_number, lpv.pan_number)), '') AS source_pan_number,
      CASE
        WHEN li.dob IS NOT NULL THEN TO_CHAR(li.dob, 'DD/MM/YYYY')
        ELSE NULL
      END AS source_date_of_birth,
      NULLIF(BTRIM(COALESCE(li.full_name, lpv.full_name, ld.name)), '') AS source_client_name,
      NULLIF(BTRIM(COALESCE(li.category, lpv.category)), '') AS source_category,
      NULLIF(BTRIM(li.address_1), '') AS source_identity_address_1,
      NULLIF(BTRIM(li.address_2), '') AS source_identity_city,
      NULLIF(BTRIM(li.state), '') AS source_state,
      NULLIF(BTRIM(li.pincode), '') AS source_pincode,
      COALESCE(
        NULLIF(BTRIM(li.aadhaar_number), ''),
        NULLIF(
          UPPER(
            REGEXP_REPLACE(
              BTRIM(COALESCE(ld.aadhaar_number_masked, '')),
              '[^0-9A-Za-z]',
              '',
              'g'
            )
          ),
          ''
        )
      ) AS source_aadhaar_number,
      NULLIF(BTRIM(lp.politically_exposed), '') AS source_politically_exposed,
      NULLIF(BTRIM(lp.annual_income), '') AS source_annual_income,
      NULLIF(BTRIM(lp.net_worth), '') AS source_net_worth,
      NULLIF(BTRIM(lp.occupation), '') AS source_occupation,
      NULLIF(BTRIM(lp.country_of_birth), '') AS source_country_of_birth,
      NULLIF(BTRIM(lp.ddpi), '') AS source_ddpi,
      NULLIF(BTRIM(lp.aadhaar_address), '') AS source_aadhaar_address,
      NULLIF(BTRIM(ld.provider), '') AS source_digilocker_provider,
      NULLIF(BTRIM(ld.address), '') AS source_digilocker_address,
      NULLIF(BTRIM(lb.account_number), '') AS source_bank_account_number,
      NULLIF(BTRIM(lb.ifsc_code), '') AS source_bank_ifsc,
      NULLIF(BTRIM(lb.bank_name), '') AS source_bank_name,
      NULLIF(BTRIM(lcc.client_code), '') AS source_client_code,
      NULLIF(BTRIM(ka.boid), '') AS source_boid,
      COALESCE(np.nominee_count, 0) AS source_nominee_count,
      NULLIF(BTRIM(lpv.first_name), '') AS source_pan_first_name,
      NULLIF(BTRIM(lpv.middle_name), '') AS source_pan_middle_name,
      NULLIF(BTRIM(lpv.last_name), '') AS source_pan_last_name
    FROM public.kyc_applications ka
    LEFT JOIN latest_contact lc
      ON lc.application_id = ka.id
    LEFT JOIN latest_identity li
      ON li.application_id = ka.id
    LEFT JOIN latest_pan_verification lpv
      ON lpv.application_id = ka.id::text
    LEFT JOIN latest_personal lp
      ON lp.application_id = ka.id
    LEFT JOIN latest_bank lb
      ON lb.application_id = ka.id
    LEFT JOIN latest_digilocker ld
      ON ld.application_id = ka.id::text
    LEFT JOIN latest_client_code lcc
      ON TRUE
    LEFT JOIN nominee_presence np
      ON np.application_id = ka.id
    WHERE ka.id = $1
  ),
  enriched_source_row AS (
    SELECT
      source_row.application_id,
      source_row.source_email,
      source_row.source_mobile,
      source_row.source_pan_number,
      source_row.source_date_of_birth,
      source_row.source_client_name,
      source_row.source_category,
      CASE
        WHEN UPPER(source_row.source_category) LIKE '%INDIVIDUAL%'
          OR UPPER(source_row.source_category) LIKE '%PERSON%'
        THEN 'I'
        ELSE NULL
      END AS source_bse_category,
      CASE
        WHEN UPPER(COALESCE(source_row.source_politically_exposed, '')) IN ('YES', 'Y', 'TRUE')
        THEN 'Y'
        WHEN UPPER(COALESCE(source_row.source_politically_exposed, '')) IN ('NO', 'N', 'FALSE')
        THEN 'N'
        ELSE NULL
      END AS source_political_ex_person,
      -- BSE ADDRESS1 is mapped from the strongest address line we currently store.
      COALESCE(
        source_row.source_identity_address_1,
        source_row.source_aadhaar_address,
        source_row.source_digilocker_address
      ) AS source_address_line1,
      -- BSE ADDRESS2 is not a city code here; we keep the broader correspondence string when available.
      COALESCE(
        source_row.source_aadhaar_address,
        source_row.source_digilocker_address
      ) AS source_address_line2,
      CASE
        WHEN source_row.source_identity_address_1 IS NOT NULL
          OR source_row.source_aadhaar_address IS NOT NULL
          OR source_row.source_digilocker_address IS NOT NULL
        THEN 'INDIA'
        ELSE NULL
      END AS source_country,
      source_row.source_state,
      source_row.source_identity_city AS source_city,
      source_row.source_pincode,
      source_row.source_annual_income,
      source_row.source_net_worth,
      source_row.source_occupation,
      source_row.source_country_of_birth,
      CASE
        WHEN UPPER(COALESCE(source_row.source_ddpi, '')) IN ('YES', 'Y', 'TRUE')
        THEN 'Y'
        WHEN UPPER(COALESCE(source_row.source_ddpi, '')) IN ('NO', 'N', 'FALSE')
        THEN 'N'
        ELSE NULL
      END AS source_is_poa,
      source_row.source_aadhaar_number,
      source_row.source_digilocker_provider,
      source_row.source_bank_account_number,
      source_row.source_bank_ifsc,
      source_row.source_bank_name,
      source_row.source_client_code,
      source_row.source_boid,
      source_row.source_application_date,
      CASE
        WHEN source_row.source_nominee_count > 0 THEN 'Y'
        ELSE 'N'
      END AS source_opted_for_nomination,
      CASE
        WHEN source_row.source_boid ~ '^[0-9]{16}$' THEN 'CDSL'
        ELSE NULL
      END AS source_depository_name1,
      COALESCE(
        source_row.source_pan_first_name,
        NULLIF(SPLIT_PART(source_row.source_client_name, ' ', 1), '')
      ) AS source_first_name,
      COALESCE(
        source_row.source_pan_middle_name,
        NULLIF(
          BTRIM(
            REGEXP_REPLACE(
              source_row.source_client_name,
              '^[^ ]+\\s*|\\s*[^ ]+$',
              '',
              'g'
            )
          ),
          ''
        )
      ) AS source_middle_name,
      COALESCE(
        source_row.source_pan_last_name,
        NULLIF(
          CASE
            WHEN POSITION(' ' IN source_row.source_client_name) > 0
            THEN REGEXP_REPLACE(source_row.source_client_name, '^.*\\s', '')
            ELSE NULL
          END,
          ''
        )
      ) AS source_last_name
      ,
      CASE
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) LIKE '%BELOW%1%'
        THEN '0'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) LIKE '%1%5%'
        THEN '1'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) LIKE '%5%10%'
        THEN '2'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) LIKE '%10%25%'
        THEN '3'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) LIKE '%25%'
          OR UPPER(COALESCE(source_row.source_annual_income, '')) LIKE '%ABOVE%'
        THEN '4'
        ELSE NULL
      END AS source_income_code
    FROM source_row
  )
`;

const getBseSourceByApplicationIdQuery = `
  ${buildBseSourceCte()}
  SELECT
    application_id,
    source_bse_category AS category,
    source_client_code AS client_code,
    source_pan_number AS pan_no,
    source_address_line1 AS address1,
    source_country AS country,
    source_state AS state,
    source_city AS city,
    source_pincode AS pincode,
    source_email AS email,
    source_mobile AS mobile_number,
    source_bank_name AS bank_name1,
    source_bank_account_number AS account_no1,
    source_bank_ifsc AS bank_branch_ifsc_code1,
    source_client_name AS client_name,
    source_client_name AS client_name_description,
    source_date_of_birth AS date_of_birth,
    source_boid AS beneficial_own_acnt_no1,
    source_first_name AS first_name,
    source_depository_name1 AS depository_name1,
    source_application_date AS client_aggrement_date,
    source_income_code AS income,
    CASE
      WHEN source_income_code IS NOT NULL THEN source_application_date
      ELSE NULL
    END AS income_date,
    CASE
      WHEN source_net_worth IS NOT NULL THEN source_application_date
      ELSE NULL
    END AS net_worth_date,
    CASE
      WHEN source_is_poa = 'Y' THEN source_application_date
      ELSE NULL
    END AS date_of_poa_for_security,
    '${DEFAULT_BSE_DEPOSITORY_PARTICIPANT_1.replace(/'/g, "''")}' AS depository_participant1,
    'Y' AS cash,
    'N' AS equity_derivative,
    'N' AS slb,
    'N' AS currency,
    'N' AS debt,
    'N' AS commderivatives,
    'N' AS egr,
    'pending' AS bse_status
  FROM enriched_source_row
  WHERE application_id = $1;
`;

const checkBseApplicationIdUniqueIndexQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'bse_data'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'application_id'
  ) AS has_unique_application_id;
`;

const upsertBseDataByApplicationIdQuery = `
  ${buildBseSourceCte()}
  INSERT INTO public.bse_data (
    application_id,
    transaction_code,
    client_type,
    status,
    category,
    client_code,
    pan_no,
    political_ex_person,
    address1,
    permn_equal_corp,
    address2,
    country,
    state,
    city,
    pincode,
    type_of_service,
    contact_details,
    email,
    mobile_number,
    std_code,
    phone_no,
    depository_name1,
    demat_id1,
    depository_participant1,
    bank_name1,
    account_no1,
    bank_name2,
    account_no2,
    bank_name3,
    account_no3,
    client_aggrement_date,
    provide_details,
    income,
    income_date,
    net_worth,
    net_worth_date,
    is_active,
    update_reason,
    first_name,
    middle_name,
    last_name,
    aadhaar_card_no,
    date_of_birth,
    client_name,
    client_name_description,
    whether_corporate,
    cin_no,
    number_of_directors,
    server_ip,
    batuser,
    cash,
    equity_derivative,
    slb,
    currency,
    debt,
    is_poa,
    poa_for_fund,
    poa_for_security,
    date_of_poa_for_fund,
    date_of_poa_for_security,
    per_country,
    per_state,
    per_city,
    per_pincode,
    commderivatives,
    opted_for_nomination,
    egr,
    beneficial_own_acnt_no1,
    opted_for_upi,
    bank_branch_ifsc_code1,
    primary_or_secondary_bank1,
    primary_or_secondary_bank3,
    bank_branch_ifsc_code4,
    bank_name4,
    account_no4,
    primary_or_secondary_bank4,
    bank_branch_ifsc_code5,
    bank_name5,
    account_no5,
    primary_or_secondary_bank5,
    primary_or_secondary_dp1,
    depository_name4,
    demat_id4,
    beneficial_own_acnt_no4,
    primary_or_secondary_dp4,
    depository_name5,
    demat_id5,
    beneficial_own_acnt_no5,
    primary_or_secondary_dp5,
    bse_status,
    request_payload,
    updated_at
  )
  SELECT
    enriched_source_row.application_id,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.bse_data existing_bse
        WHERE existing_bse.application_id = enriched_source_row.application_id
      )
      THEN 'M'
      ELSE 'N'
    END AS transaction_code,
    -- Current onboarding flow is individual-only, so BSE CLIENTTYPE is fixed to I.
    'I' AS client_type,
    -- Current retail onboarding uses active client status CL.
    'CL' AS status,
    -- Only map BSE category when the source explicitly indicates an individual/person flow.
    enriched_source_row.source_bse_category AS category,
    enriched_source_row.source_client_code AS client_code,
    enriched_source_row.source_pan_number AS pan_no,
    enriched_source_row.source_political_ex_person AS political_ex_person,
    enriched_source_row.source_address_line1 AS address1,
    -- TODO: The project does not yet store a dedicated permanent-vs-correspondence flag for BSE.
    NULL::varchar AS permn_equal_corp,
    enriched_source_row.source_address_line2 AS address2,
    enriched_source_row.source_country AS country,
    enriched_source_row.source_state AS state,
    enriched_source_row.source_city AS city,
    enriched_source_row.source_pincode AS pincode,
    -- TODO: No authoritative source column currently stores the BSE type-of-service code.
    NULL::varchar AS type_of_service,
    -- TODO: No authoritative source column currently stores the BSE contact-details preference code.
    NULL::varchar AS contact_details,
    enriched_source_row.source_email AS email,
    enriched_source_row.source_mobile AS mobile_number,
    -- TODO: STD code is not stored in the current KYC flow.
    NULL::varchar AS std_code,
    -- TODO: Landline phone number is not stored in the current KYC flow.
    NULL::varchar AS phone_no,
    -- BOID is currently only reliable enough to infer CDSL for 16-digit accounts.
    enriched_source_row.source_depository_name1 AS depository_name1,
    -- TODO: Separate demat/DP identifiers are not stored independently today.
    NULL::varchar AS demat_id1,
    '${DEFAULT_BSE_DEPOSITORY_PARTICIPANT_1.replace(/'/g, "''")}' AS depository_participant1,
    enriched_source_row.source_bank_name AS bank_name1,
    enriched_source_row.source_bank_account_number AS account_no1,
    ''::varchar AS bank_name2,
    ''::varchar AS account_no2,
    ''::varchar AS bank_name3,
    ''::varchar AS account_no3,
    enriched_source_row.source_application_date AS client_aggrement_date,
    '1' AS provide_details,
    enriched_source_row.source_income_code AS income,
    CASE
      WHEN enriched_source_row.source_income_code IS NOT NULL
      THEN enriched_source_row.source_application_date
      ELSE NULL
    END AS income_date,
    enriched_source_row.source_net_worth AS net_worth,
    CASE
      WHEN enriched_source_row.source_net_worth IS NOT NULL
      THEN enriched_source_row.source_application_date
      ELSE NULL
    END AS net_worth_date,
    'Y' AS is_active,
    NULL::varchar AS update_reason,
    enriched_source_row.source_first_name AS first_name,
    enriched_source_row.source_middle_name AS middle_name,
    enriched_source_row.source_last_name AS last_name,
    enriched_source_row.source_aadhaar_number AS aadhaar_card_no,
    enriched_source_row.source_date_of_birth AS date_of_birth,
    enriched_source_row.source_client_name AS client_name,
    enriched_source_row.source_client_name AS client_name_description,
    'N' AS whether_corporate,
    NULL::varchar AS cin_no,
    0 AS number_of_directors,
    NULL::varchar AS server_ip,
    NULL::varchar AS batuser,
    'Y' AS cash,
    'N' AS equity_derivative,
    'N' AS slb,
    'N' AS currency,
    'N' AS debt,
    enriched_source_row.source_is_poa AS is_poa,
    'N' AS poa_for_fund,
    CASE
      WHEN enriched_source_row.source_is_poa = 'Y' THEN 'Y'
      ELSE 'N'
    END AS poa_for_security,
    NULL::varchar AS date_of_poa_for_fund,
    CASE
      WHEN enriched_source_row.source_is_poa = 'Y'
      THEN enriched_source_row.source_application_date
      ELSE NULL
    END AS date_of_poa_for_security,
    enriched_source_row.source_country AS per_country,
    enriched_source_row.source_state AS per_state,
    enriched_source_row.source_city AS per_city,
    enriched_source_row.source_pincode AS per_pincode,
    'N' AS commderivatives,
    enriched_source_row.source_opted_for_nomination AS opted_for_nomination,
    'N' AS egr,
    enriched_source_row.source_boid AS beneficial_own_acnt_no1,
    -- TODO: Current KYC flow does not store the BSE UPI choice.
    NULL::varchar AS opted_for_upi,
    enriched_source_row.source_bank_ifsc AS bank_branch_ifsc_code1,
    'P' AS primary_or_secondary_bank1,
    ''::varchar AS primary_or_secondary_bank3,
    ''::varchar AS bank_branch_ifsc_code4,
    ''::varchar AS bank_name4,
    ''::varchar AS account_no4,
    ''::varchar AS primary_or_secondary_bank4,
    ''::varchar AS bank_branch_ifsc_code5,
    ''::varchar AS bank_name5,
    ''::varchar AS account_no5,
    ''::varchar AS primary_or_secondary_bank5,
    'P' AS primary_or_secondary_dp1,
    ''::varchar AS depository_name4,
    ''::varchar AS demat_id4,
    ''::varchar AS beneficial_own_acnt_no4,
    ''::varchar AS primary_or_secondary_dp4,
    ''::varchar AS depository_name5,
    ''::varchar AS demat_id5,
    ''::varchar AS beneficial_own_acnt_no5,
    ''::varchar AS primary_or_secondary_dp5,
    'pending' AS bse_status,
    jsonb_build_object(
      'source_tables',
      ARRAY[
        'public.kyc_applications',
        'public.contact_details',
        'public.identity_verifications',
        'public.pan_verifications',
        'public.personal_details',
        'public.bank_details',
        'public.digilocker_details',
        'public.client_codes',
        'public.nominee_details'
      ],
      'field_mapping',
      (
        jsonb_build_object(
          'application_id', 'kyc_applications.id',
          'transaction_code', 'derived: N on first export, M on re-export',
          'client_type', 'fixed: I for current individual onboarding flow',
          'status', 'fixed: CL for current retail onboarding flow',
          'category', 'identity_verifications.category or pan_verifications.category -> BSE code I only when individual/person is explicit',
          'client_code', 'client_codes.client_code',
          'pan_no', 'COALESCE(identity_verifications.pan_number, pan_verifications.pan_number)',
          'political_ex_person', 'personal_details.politically_exposed -> Y/N',
          'address1', 'COALESCE(identity_verifications.address_1, personal_details.aadhaar_address, digilocker_details.address)',
          'address2', 'COALESCE(personal_details.aadhaar_address, digilocker_details.address)',
          'country', 'fixed INDIA when an address source exists',
          'state', 'identity_verifications.state',
          'city', 'identity_verifications.address_2',
          'pincode', 'identity_verifications.pincode',
          'email', 'contact_details.email',
          'mobile_number', 'contact_details.mobile_number',
          'depository_name1', 'derived from kyc_applications.boid -> CDSL when 16-digit BOID',
          'depository_participant1', 'env.BSE_DEPOSITORY_PARTICIPANT_1 fallback fixed business default',
          'bank_name1', 'bank_details.bank_name',
          'account_no1', 'bank_details.account_number',
          'client_aggrement_date', 'kyc_applications.created_at fallback CURRENT_DATE -> DD/MM/YYYY',
          'provide_details', 'fixed default: 1 for current retail flow',
          'income', 'personal_details.annual_income -> BSE income code heuristic',
          'income_date', 'application created date when income is available',
          'net_worth', 'personal_details.net_worth',
          'net_worth_date', 'application created date when net worth is available',
          'first_name', 'pan_verifications.first_name fallback split from full name'
        )
        ||
        jsonb_build_object(
          'middle_name', 'pan_verifications.middle_name fallback split from full name',
          'last_name', 'pan_verifications.last_name fallback split from full name',
          'aadhaar_card_no', 'identity_verifications.aadhaar_number',
          'date_of_birth', 'identity_verifications.dob -> DD/MM/YYYY',
          'client_name', 'COALESCE(identity_verifications.full_name, pan_verifications.full_name, digilocker_details.name)',
          'client_name_description', 'same as client_name for current retail flow',
          'cash', 'fixed default Y for current retail flow',
          'equity_derivative', 'fixed default N until segment choice is captured',
          'slb', 'fixed default N until segment choice is captured',
          'currency', 'fixed default N until segment choice is captured',
          'debt', 'fixed default N until segment choice is captured',
          'is_poa', 'personal_details.ddpi -> Y/N',
          'poa_for_fund', 'fixed default N for current retail flow',
          'poa_for_security', 'derived from is_poa',
          'date_of_poa_for_security', 'application created date when is_poa = Y',
          'per_country', 'same as country for current single-address flow',
          'per_state', 'identity_verifications.state',
          'per_city', 'identity_verifications.address_2',
          'per_pincode', 'identity_verifications.pincode',
          'commderivatives', 'fixed default N until segment choice is captured',
          'opted_for_nomination', 'derived from nominee_details row presence',
          'egr', 'fixed default N for current retail flow',
          'beneficial_own_acnt_no1', 'kyc_applications.boid',
          'bank_branch_ifsc_code1', 'bank_details.ifsc_code',
          'primary_or_secondary_bank1', 'fixed P because one bank record is stored',
          'primary_or_secondary_dp1', 'fixed P because one BOID/DP record is stored',
          'bse_status', 'fixed local staging status pending'
        )
      ),
      'todo_fields',
      ARRAY[
        'permn_equal_corp',
        'type_of_service',
        'contact_details',
        'std_code',
        'phone_no',
        'demat_id1',
        'opted_for_upi'
      ]
    ) AS request_payload,
    NOW() AS updated_at
  FROM enriched_source_row
  WHERE application_id = $1
  ON CONFLICT (application_id) DO UPDATE SET
    transaction_code = EXCLUDED.transaction_code,
    client_type = EXCLUDED.client_type,
    status = EXCLUDED.status,
    category = EXCLUDED.category,
    client_code = EXCLUDED.client_code,
    pan_no = EXCLUDED.pan_no,
    political_ex_person = EXCLUDED.political_ex_person,
    address1 = EXCLUDED.address1,
    permn_equal_corp = EXCLUDED.permn_equal_corp,
    address2 = EXCLUDED.address2,
    country = EXCLUDED.country,
    state = EXCLUDED.state,
    city = EXCLUDED.city,
    pincode = EXCLUDED.pincode,
    type_of_service = EXCLUDED.type_of_service,
    contact_details = EXCLUDED.contact_details,
    email = EXCLUDED.email,
    mobile_number = EXCLUDED.mobile_number,
    std_code = EXCLUDED.std_code,
    phone_no = EXCLUDED.phone_no,
    depository_name1 = EXCLUDED.depository_name1,
    demat_id1 = EXCLUDED.demat_id1,
    depository_participant1 = EXCLUDED.depository_participant1,
    bank_name1 = EXCLUDED.bank_name1,
    account_no1 = EXCLUDED.account_no1,
    bank_name2 = EXCLUDED.bank_name2,
    account_no2 = EXCLUDED.account_no2,
    bank_name3 = EXCLUDED.bank_name3,
    account_no3 = EXCLUDED.account_no3,
    client_aggrement_date = EXCLUDED.client_aggrement_date,
    provide_details = EXCLUDED.provide_details,
    income = EXCLUDED.income,
    income_date = EXCLUDED.income_date,
    net_worth = EXCLUDED.net_worth,
    net_worth_date = EXCLUDED.net_worth_date,
    is_active = EXCLUDED.is_active,
    update_reason = EXCLUDED.update_reason,
    first_name = EXCLUDED.first_name,
    middle_name = EXCLUDED.middle_name,
    last_name = EXCLUDED.last_name,
    aadhaar_card_no = EXCLUDED.aadhaar_card_no,
    date_of_birth = EXCLUDED.date_of_birth,
    client_name = EXCLUDED.client_name,
    client_name_description = EXCLUDED.client_name_description,
    whether_corporate = EXCLUDED.whether_corporate,
    cin_no = EXCLUDED.cin_no,
    number_of_directors = EXCLUDED.number_of_directors,
    server_ip = EXCLUDED.server_ip,
    batuser = EXCLUDED.batuser,
    cash = EXCLUDED.cash,
    equity_derivative = EXCLUDED.equity_derivative,
    slb = EXCLUDED.slb,
    currency = EXCLUDED.currency,
    debt = EXCLUDED.debt,
    is_poa = EXCLUDED.is_poa,
    poa_for_fund = EXCLUDED.poa_for_fund,
    poa_for_security = EXCLUDED.poa_for_security,
    date_of_poa_for_fund = EXCLUDED.date_of_poa_for_fund,
    date_of_poa_for_security = EXCLUDED.date_of_poa_for_security,
    per_country = EXCLUDED.per_country,
    per_state = EXCLUDED.per_state,
    per_city = EXCLUDED.per_city,
    per_pincode = EXCLUDED.per_pincode,
    commderivatives = EXCLUDED.commderivatives,
    opted_for_nomination = EXCLUDED.opted_for_nomination,
    egr = EXCLUDED.egr,
    beneficial_own_acnt_no1 = EXCLUDED.beneficial_own_acnt_no1,
    opted_for_upi = EXCLUDED.opted_for_upi,
    bank_branch_ifsc_code1 = EXCLUDED.bank_branch_ifsc_code1,
    primary_or_secondary_bank1 = EXCLUDED.primary_or_secondary_bank1,
    primary_or_secondary_bank3 = EXCLUDED.primary_or_secondary_bank3,
    bank_branch_ifsc_code4 = EXCLUDED.bank_branch_ifsc_code4,
    bank_name4 = EXCLUDED.bank_name4,
    account_no4 = EXCLUDED.account_no4,
    primary_or_secondary_bank4 = EXCLUDED.primary_or_secondary_bank4,
    bank_branch_ifsc_code5 = EXCLUDED.bank_branch_ifsc_code5,
    bank_name5 = EXCLUDED.bank_name5,
    account_no5 = EXCLUDED.account_no5,
    primary_or_secondary_bank5 = EXCLUDED.primary_or_secondary_bank5,
    primary_or_secondary_dp1 = EXCLUDED.primary_or_secondary_dp1,
    depository_name4 = EXCLUDED.depository_name4,
    demat_id4 = EXCLUDED.demat_id4,
    beneficial_own_acnt_no4 = EXCLUDED.beneficial_own_acnt_no4,
    primary_or_secondary_dp4 = EXCLUDED.primary_or_secondary_dp4,
    depository_name5 = EXCLUDED.depository_name5,
    demat_id5 = EXCLUDED.demat_id5,
    beneficial_own_acnt_no5 = EXCLUDED.beneficial_own_acnt_no5,
    primary_or_secondary_dp5 = EXCLUDED.primary_or_secondary_dp5,
    bse_status = EXCLUDED.bse_status,
    request_payload = EXCLUDED.request_payload,
    updated_at = NOW()
  RETURNING id, application_id;
`;

module.exports = {
  getBseSourceByApplicationIdQuery,
  checkBseApplicationIdUniqueIndexQuery,
  upsertBseDataByApplicationIdQuery,
};
