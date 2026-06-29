const buildNsdlSourceCte = () => `
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
      pd.net_worth,
      pd.occupation,
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
      ka.application_number,
      NULLIF(BTRIM(COALESCE(li.pan_number, lpv.pan_number)), '') AS source_pan_number,
      li.dob AS source_dob,
      NULLIF(BTRIM(COALESCE(li.full_name, lpv.full_name, ld.name)), '') AS source_client_name,
      NULLIF(BTRIM(COALESCE(li.address_1, lp.aadhaar_address, ld.address)), '') AS source_address_text,
      NULLIF(BTRIM(li.address_2), '') AS source_city,
      NULLIF(BTRIM(li.state), '') AS source_state,
      NULLIF(BTRIM(li.pincode), '') AS source_pincode,
      NULLIF(BTRIM(COALESCE(lp.father_name, '')), '') AS source_father_name,
      NULLIF(BTRIM(COALESCE(li.gender, lp.gender)), '') AS source_gender,
      NULLIF(BTRIM(lp.occupation), '') AS source_occupation,
      NULLIF(BTRIM(lp.annual_income), '') AS source_annual_income,
      NULLIF(BTRIM(lp.net_worth), '') AS source_net_worth,
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
      COALESCE(np.nominee_count, 0) AS source_nominee_count,
      existing.sgn AS existing_sgn,
      existing.sgntrsz AS existing_sgntrsz,
      existing.holder_panvrfyflg AS existing_holder_panvrfyflg,
      existing.cntrlsctiesdpstryptcpt AS existing_dpid,
      existing.chnlid AS existing_chnlid,
      existing.bnfcryshrtnm AS existing_short_name
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
    LEFT JOIN public.nsdl_data existing
      ON existing.application_id = ka.id
    WHERE ka.id = $1
  ),
  prepared_row AS (
    SELECT
      source_row.application_id,
      'BOSET'::varchar AS botxntyp,
      'DP'::varchar AS cntrlsctiesdpstryptcptrole,
      -- TODO: DPID is NSDL participant metadata; current KYC tables do not store it, so we use env/existing staged value.
      COALESCE(NULLIF($2, ''), source_row.existing_dpid) AS cntrlsctiesdpstryptcpt,
      '000000'::varchar AS brnchid,
      CAST(TO_CHAR(NOW(), 'DDHH24MI') AS integer) AS btchid,
      -- TODO: Channel ID is NSDL integration metadata; current KYC tables do not store it, so we use env/existing staged value.
      COALESCE(NULLIF($3, ''), source_row.existing_chnlid) AS chnlid,
      -- TODO: Client signature image is not stored in the current KYC schema; caller must supply it or preserve an already staged value.
      COALESCE(NULLIF($4, ''), source_row.existing_sgn) AS sgn,
      CASE
        WHEN NULLIF($4, '') IS NOT NULL
          AND LEFT(NULLIF($4, ''), 2) = '0x'
        THEN ((LENGTH(NULLIF($4, '')) - 2) / 2)
        ELSE source_row.existing_sgntrsz
      END AS sgntrsz,
      'NO'::varchar AS postvconf,
      CASE
        WHEN source_row.source_nominee_count > 0 THEN 'NO'
        ELSE 'OON'
      END AS nonmntnflg,
      'IND'::varchar AS prdnb,
      'INRES'::varchar AS bnfcrysubtp,
      -- TODO: NSDL short name is not captured explicitly today; fallback is derived from applicant name unless caller overrides it.
      COALESCE(
        NULLIF($6, ''),
        source_row.existing_short_name,
        NULLIF(LEFT(REGEXP_REPLACE(COALESCE(source_row.source_client_name, ''), '\\s+', ' ', 'g'), 16), '')
      ) AS bnfcryshrtnm,
      'NHB'::varchar AS bnfcryacctctgy,
      CASE
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) IN ('PRIVATE SECTOR', 'PUBLIC SECTOR', 'GOVERNMENT SERVICE', 'GOVT SERVICE', 'GOVERNMENT', 'SERVICE') THEN 'SER'
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) = 'STUDENT' THEN 'STU'
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) = 'HOUSEWIFE' THEN 'HOU'
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) = 'LANDLORD' THEN 'LAN'
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) = 'BUSINESS' THEN 'BUS'
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) = 'PROFESSIONAL' THEN 'PRO'
        WHEN UPPER(COALESCE(source_row.source_occupation, '')) IN ('AGRICULTURIST', 'AGRICULTURE', 'FARMER') THEN 'FAR'
        WHEN source_row.source_occupation IS NOT NULL THEN 'OTH'
        ELSE NULL
      END AS ocptn,
      'COR'::varchar AS adrprefflg,
      'FIH'::varchar AS comtobesentto,
      'CORAD'::varchar AS corad_purpcd,
      'ADD'::varchar AS corad_addmoddelind,
      NULLIF(BTRIM(SUBSTRING(COALESCE(source_row.source_address_text, '') FROM 1 FOR 55)), '') AS corad_adr1,
      COALESCE(
        NULLIF(BTRIM(SUBSTRING(COALESCE(source_row.source_address_text, '') FROM 56 FOR 55)), ''),
        NULLIF(BTRIM(source_row.source_city), '')
      ) AS corad_adr2,
      COALESCE(
        NULLIF(BTRIM(SUBSTRING(COALESCE(source_row.source_address_text, '') FROM 111 FOR 55)), ''),
        NULLIF(BTRIM(source_row.source_state), '')
      ) AS corad_adr3,
      NULLIF(BTRIM(source_row.source_city), '') AS corad_adr4orcity,
      CASE
        WHEN source_row.source_address_text IS NOT NULL THEN 'IN'
        ELSE NULL
      END AS corad_ctry,
      CASE
        WHEN source_row.source_pincode IS NOT NULL
          AND LENGTH(source_row.source_pincode) <= 10
        THEN source_row.source_pincode
        ELSE NULL
      END AS corad_pstcd,
      CASE
        WHEN UPPER(source_row.source_state) = 'JAMMU AND KASHMIR' THEN '1'
        WHEN UPPER(source_row.source_state) = 'HIMACHAL PRADESH' THEN '2'
        WHEN UPPER(source_row.source_state) = 'PUNJAB' THEN '3'
        WHEN UPPER(source_row.source_state) = 'CHANDIGARH' THEN '4'
        WHEN UPPER(source_row.source_state) = 'UTTARAKHAND' THEN '5'
        WHEN UPPER(source_row.source_state) = 'HARYANA' THEN '6'
        WHEN UPPER(source_row.source_state) = 'DELHI' THEN '7'
        WHEN UPPER(source_row.source_state) = 'RAJASTHAN' THEN '8'
        WHEN UPPER(source_row.source_state) = 'UTTAR PRADESH' THEN '9'
        WHEN UPPER(source_row.source_state) = 'BIHAR' THEN '10'
        WHEN UPPER(source_row.source_state) = 'SIKKIM' THEN '11'
        WHEN UPPER(source_row.source_state) = 'ARUNACHAL PRADESH' THEN '12'
        WHEN UPPER(source_row.source_state) = 'NAGALAND' THEN '13'
        WHEN UPPER(source_row.source_state) = 'MANIPUR' THEN '14'
        WHEN UPPER(source_row.source_state) = 'MIZORAM' THEN '15'
        WHEN UPPER(source_row.source_state) = 'TRIPURA' THEN '16'
        WHEN UPPER(source_row.source_state) = 'MEGHALAYA' THEN '17'
        WHEN UPPER(source_row.source_state) = 'ASSAM' THEN '18'
        WHEN UPPER(source_row.source_state) = 'WEST BENGAL' THEN '19'
        WHEN UPPER(source_row.source_state) = 'JHARKHAND' THEN '20'
        WHEN UPPER(source_row.source_state) IN ('ODISHA', 'ORISSA') THEN '21'
        WHEN UPPER(source_row.source_state) = 'CHHATTISGARH' THEN '22'
        WHEN UPPER(source_row.source_state) = 'MADHYA PRADESH' THEN '23'
        WHEN UPPER(source_row.source_state) = 'GUJARAT' THEN '24'
        WHEN UPPER(source_row.source_state) IN ('DAMAN AND DIU', 'DAMAN & DIU') THEN '25'
        WHEN UPPER(source_row.source_state) IN ('DADRA AND NAGAR HAVELI AND DAMAN AND DIU', 'DADRA-NGR-HVELI-DAMAN-DIU') THEN '26'
        WHEN UPPER(source_row.source_state) = 'MAHARASHTRA' THEN '27'
        WHEN UPPER(source_row.source_state) = 'KARNATAKA' THEN '29'
        WHEN UPPER(source_row.source_state) = 'GOA' THEN '30'
        WHEN UPPER(source_row.source_state) = 'LAKSHADWEEP' THEN '31'
        WHEN UPPER(source_row.source_state) = 'KERALA' THEN '32'
        WHEN UPPER(source_row.source_state) = 'TAMIL NADU' THEN '33'
        WHEN UPPER(source_row.source_state) = 'PUDUCHERRY' THEN '34'
        WHEN UPPER(source_row.source_state) IN ('ANDAMAN & NICOBAR ISLANDS', 'ANDAMAN AND NICOBAR ISLANDS') THEN '35'
        WHEN UPPER(source_row.source_state) = 'TELANGANA' THEN '36'
        WHEN UPPER(source_row.source_state) = 'ANDHRA PRADESH' THEN '37'
        WHEN UPPER(source_row.source_state) = 'LADAKH' THEN '38'
        WHEN source_row.source_state IS NOT NULL AND LENGTH(source_row.source_state) <= 13 THEN source_row.source_state
        ELSE NULL
      END AS corad_ctrysubdvsncd,
      CASE
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) IN ('UPTO 1 LAKH', 'UPTO RS.1 LAKHS', 'BELOW 1 LAKH', 'LESS THAN 1 LAKH') THEN 'UPT1L'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) IN ('1 - 5 LAKH', '1-5 LAKH', '1 TO 5 LAKH') THEN '1LT5L'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) IN ('5 - 10 LAKH', '5-10 LAKH', '5 TO 10 LAKH') THEN '5LTXL'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) IN ('10 - 25 LAKH', '10-25 LAKH', '10 TO 25 LAKH') THEN 'XLTXXV'
        WHEN UPPER(COALESCE(source_row.source_annual_income, '')) IN ('ABOVE 25 LAKH', 'MORE THAN 25 LAKH', '> 25 LAKH', '25+ LAKH') THEN 'GT24L'
        ELSE NULL
      END AS grssanlincmrg,
      CASE
        WHEN source_row.source_net_worth ~ '^[0-9]+(\\.[0-9]{2})?$'
        THEN CAST(source_row.source_net_worth AS numeric(18, 2))
        ELSE NULL
      END AS netwrth,
      NULL::varchar AS netwrthasondt,
      'RI'::varchar AS bnfcrytaxddctnsts,
      CASE
        WHEN source_row.source_bank_account_number IS NOT NULL
          AND LENGTH(source_row.source_bank_account_number) <= 30
        THEN source_row.source_bank_account_number
        ELSE NULL
      END AS bnfcrybkacctnb,
      CASE
        WHEN UPPER(COALESCE(source_row.source_bank_account_type, '')) IN ('SAVINGS', 'SAVING') THEN 'SVG'
        WHEN UPPER(COALESCE(source_row.source_bank_account_type, '')) IN ('CURRENT') THEN 'CUR'
        WHEN UPPER(COALESCE(source_row.source_bank_account_type, '')) IN ('CASH CREDIT', 'OD', 'OVERDRAFT') THEN 'CCR'
        ELSE NULL
      END AS bkaccttp,
      CASE
        WHEN source_row.source_bank_name IS NOT NULL
          AND LENGTH(source_row.source_bank_name) <= 35
        THEN source_row.source_bank_name
        ELSE NULL
      END AS bnfcrybknm,
      CASE
        WHEN source_row.source_bank_ifsc IS NOT NULL
          AND LENGTH(source_row.source_bank_ifsc) <= 15
        THEN source_row.source_bank_ifsc
        ELSE NULL
      END AS inifsc,
      'FH'::varchar AS holder_purpse,
      CASE
        WHEN source_row.source_client_name IS NOT NULL
          AND LENGTH(source_row.source_client_name) <= 135
        THEN source_row.source_client_name
        ELSE NULL
      END AS holder_frstnm,
      CASE
        WHEN source_row.source_father_name IS NOT NULL
          AND LENGTH(source_row.source_father_name) <= 50
        THEN source_row.source_father_name
        ELSE NULL
      END AS holder_scndhldrnmoffthr,
      TO_CHAR(source_row.source_dob, 'YYYY-MM-DD') AS holder_birthdt,
      CASE
        WHEN UPPER(COALESCE(source_row.source_gender, '')) IN ('MALE', 'M') THEN 'MALE'
        WHEN UPPER(COALESCE(source_row.source_gender, '')) IN ('FEMALE', 'F') THEN 'FMALE'
        WHEN UPPER(COALESCE(source_row.source_gender, '')) IN ('TRANSGENDER', 'T', 'THIRD GENDER') THEN 'TRGEN'
        ELSE NULL
      END AS holder_gndr,
      CASE
        WHEN source_row.source_pan_number IS NOT NULL
          AND LENGTH(source_row.source_pan_number) <= 10
        THEN source_row.source_pan_number
        ELSE NULL
      END AS holder_pan,
      -- TODO: PAN verification flag needs NSDL-specific confirmation when it cannot be inferred from already staged data.
      COALESCE(NULLIF($5, ''), source_row.existing_holder_panvrfyflg) AS holder_panvrfyflg,
      CASE
        WHEN source_row.source_aadhaar_number IS NOT NULL
          AND LENGTH(source_row.source_aadhaar_number) <= 16
        THEN source_row.source_aadhaar_number
        ELSE NULL
      END AS holder_uid,
      CASE
        WHEN source_row.source_mobile IS NOT NULL THEN 'YES'
        ELSE NULL
      END AS holder_smsfclty,
      CASE
        WHEN source_row.source_mobile IS NOT NULL THEN '91'
        ELSE NULL
      END AS holder_prmryisdcd,
      CASE
        WHEN source_row.source_mobile IS NOT NULL
          AND LENGTH(source_row.source_mobile) <= 17
        THEN source_row.source_mobile
        ELSE NULL
      END AS holder_mobnb,
      CASE
        WHEN source_row.source_mobile IS NOT NULL THEN 'NO'
        ELSE NULL
      END AS holder_fmlyflgformobnbof,
      CASE
        WHEN source_row.source_email IS NOT NULL
          AND LENGTH(source_row.source_email) <= 100
        THEN source_row.source_email
        ELSE NULL
      END AS holder_emailadr,
      CASE
        WHEN source_row.source_email IS NOT NULL THEN 'NO'
        ELSE NULL
      END AS holder_fmlyflgforemailadr,
      'ADD'::varchar AS holder_addmoddelind,
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
          'public.nsdl_data'
        ],
        'field_mapping',
        jsonb_build_object(
          'cntrlsctiesdpstryptcpt', 'env.NSDL_DPID fallback existing nsdl_data.cntrlsctiesdpstryptcpt',
          'chnlid', 'env.NSDL_CHANNEL_ID fallback existing nsdl_data.chnlid',
          'sgn', 'request.body.sgn fallback existing nsdl_data.sgn',
          'holder_panvrfyflg', 'request.body.pan_verify_flag fallback existing nsdl_data.holder_panvrfyflg',
          'bnfcryshrtnm', 'request.body.short_name fallback existing nsdl_data.bnfcryshrtnm fallback first 16 chars of applicant name',
          'ocptn', 'personal_details.occupation -> NSDL occupation code',
          'grssanlincmrg', 'personal_details.annual_income -> NSDL income code',
          'corad_ctrysubdvsncd', 'identity_verifications.state -> Appendix 6 state code',
          'holder_frstnm', 'COALESCE(identity_verifications.full_name, pan_verifications.full_name, digilocker_details.name)',
          'holder_birthdt', 'identity_verifications.dob',
          'holder_gndr', 'COALESCE(identity_verifications.gender, personal_details.gender)',
          'holder_pan', 'COALESCE(identity_verifications.pan_number, pan_verifications.pan_number)',
          'holder_uid', 'identity_verifications.aadhaar_number when fully numeric and unmasked',
          'holder_emailadr', 'contact_details.email',
          'holder_mobnb', 'contact_details.mobile_number',
          'bnfcrybkacctnb', 'bank_details.account_number',
          'bkaccttp', 'bank_details.account_type -> SVG/CUR/CCR',
          'bnfcrybknm', 'bank_details.bank_name',
          'inifsc', 'bank_details.ifsc_code'
        ),
        'todo_fields',
        ARRAY[
          'signature_source_not_stored_in_current_kyc_tables',
          'holder_panvrfyflg_requires_nsdl_specific_confirmation_when_not_staged_already',
          'bnfcryshrtnm_is_derived_when_no_nsdl_short_name_override_is_provided',
          'address_lines_are_split_from_the_best_available_single_address_string'
        ]
      ) AS request_payload
    FROM source_row
  )
`;

const getNsdlSourceByApplicationIdQuery = `
  ${buildNsdlSourceCte()}
  SELECT *
  FROM prepared_row
  WHERE application_id = $1;
`;

const checkNsdlApplicationIdUniqueIndexQuery = `
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
      AND tc.table_name = kcu.table_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'nsdl_data'
      AND tc.constraint_type = 'UNIQUE'
      AND kcu.column_name = 'application_id'
  ) AS has_unique_application_id;
`;

const upsertNsdlDataByApplicationIdQuery = `
  ${buildNsdlSourceCte()}
  INSERT INTO public.nsdl_data (
    application_id,
    botxntyp,
    cntrlsctiesdpstryptcptrole,
    cntrlsctiesdpstryptcpt,
    brnchid,
    btchid,
    chnlid,
    sgn,
    sgntrsz,
    postvconf,
    nonmntnflg,
    prdnb,
    bnfcrysubtp,
    bnfcryshrtnm,
    bnfcryacctctgy,
    ocptn,
    adrprefflg,
    comtobesentto,
    corad_purpcd,
    corad_addmoddelind,
    corad_adr1,
    corad_adr2,
    corad_adr3,
    corad_adr4orcity,
    corad_ctry,
    corad_pstcd,
    corad_ctrysubdvsncd,
    grssanlincmrg,
    netwrth,
    netwrthasondt,
    bnfcrytaxddctnsts,
    bnfcrybkacctnb,
    bkaccttp,
    bnfcrybknm,
    inifsc,
    holder_purpse,
    holder_frstnm,
    holder_scndhldrnmoffthr,
    holder_birthdt,
    holder_gndr,
    holder_pan,
    holder_panvrfyflg,
    holder_uid,
    holder_smsfclty,
    holder_prmryisdcd,
    holder_mobnb,
    holder_fmlyflgformobnbof,
    holder_emailadr,
    holder_fmlyflgforemailadr,
    holder_addmoddelind,
    request_payload,
    updated_at
  )
  SELECT
    application_id,
    botxntyp,
    cntrlsctiesdpstryptcptrole,
    cntrlsctiesdpstryptcpt,
    brnchid,
    btchid,
    chnlid,
    sgn,
    sgntrsz,
    postvconf,
    nonmntnflg,
    prdnb,
    bnfcrysubtp,
    bnfcryshrtnm,
    bnfcryacctctgy,
    ocptn,
    adrprefflg,
    comtobesentto,
    corad_purpcd,
    corad_addmoddelind,
    corad_adr1,
    corad_adr2,
    corad_adr3,
    corad_adr4orcity,
    corad_ctry,
    corad_pstcd,
    corad_ctrysubdvsncd,
    grssanlincmrg,
    netwrth,
    netwrthasondt,
    bnfcrytaxddctnsts,
    bnfcrybkacctnb,
    bkaccttp,
    bnfcrybknm,
    inifsc,
    holder_purpse,
    holder_frstnm,
    holder_scndhldrnmoffthr,
    holder_birthdt,
    holder_gndr,
    holder_pan,
    holder_panvrfyflg,
    holder_uid,
    holder_smsfclty,
    holder_prmryisdcd,
    holder_mobnb,
    holder_fmlyflgformobnbof,
    holder_emailadr,
    holder_fmlyflgforemailadr,
    holder_addmoddelind,
    request_payload,
    NOW()
  FROM prepared_row
  WHERE application_id = $1
  ON CONFLICT (application_id) DO UPDATE SET
    botxntyp = EXCLUDED.botxntyp,
    cntrlsctiesdpstryptcptrole = EXCLUDED.cntrlsctiesdpstryptcptrole,
    cntrlsctiesdpstryptcpt = EXCLUDED.cntrlsctiesdpstryptcpt,
    brnchid = EXCLUDED.brnchid,
    btchid = EXCLUDED.btchid,
    chnlid = EXCLUDED.chnlid,
    sgn = EXCLUDED.sgn,
    sgntrsz = EXCLUDED.sgntrsz,
    postvconf = EXCLUDED.postvconf,
    nonmntnflg = EXCLUDED.nonmntnflg,
    prdnb = EXCLUDED.prdnb,
    bnfcrysubtp = EXCLUDED.bnfcrysubtp,
    bnfcryshrtnm = EXCLUDED.bnfcryshrtnm,
    bnfcryacctctgy = EXCLUDED.bnfcryacctctgy,
    ocptn = EXCLUDED.ocptn,
    adrprefflg = EXCLUDED.adrprefflg,
    comtobesentto = EXCLUDED.comtobesentto,
    corad_purpcd = EXCLUDED.corad_purpcd,
    corad_addmoddelind = EXCLUDED.corad_addmoddelind,
    corad_adr1 = EXCLUDED.corad_adr1,
    corad_adr2 = EXCLUDED.corad_adr2,
    corad_adr3 = EXCLUDED.corad_adr3,
    corad_adr4orcity = EXCLUDED.corad_adr4orcity,
    corad_ctry = EXCLUDED.corad_ctry,
    corad_pstcd = EXCLUDED.corad_pstcd,
    corad_ctrysubdvsncd = EXCLUDED.corad_ctrysubdvsncd,
    grssanlincmrg = EXCLUDED.grssanlincmrg,
    netwrth = EXCLUDED.netwrth,
    netwrthasondt = EXCLUDED.netwrthasondt,
    bnfcrytaxddctnsts = EXCLUDED.bnfcrytaxddctnsts,
    bnfcrybkacctnb = EXCLUDED.bnfcrybkacctnb,
    bkaccttp = EXCLUDED.bkaccttp,
    bnfcrybknm = EXCLUDED.bnfcrybknm,
    inifsc = EXCLUDED.inifsc,
    holder_purpse = EXCLUDED.holder_purpse,
    holder_frstnm = EXCLUDED.holder_frstnm,
    holder_scndhldrnmoffthr = EXCLUDED.holder_scndhldrnmoffthr,
    holder_birthdt = EXCLUDED.holder_birthdt,
    holder_gndr = EXCLUDED.holder_gndr,
    holder_pan = EXCLUDED.holder_pan,
    holder_panvrfyflg = EXCLUDED.holder_panvrfyflg,
    holder_uid = EXCLUDED.holder_uid,
    holder_smsfclty = EXCLUDED.holder_smsfclty,
    holder_prmryisdcd = EXCLUDED.holder_prmryisdcd,
    holder_mobnb = EXCLUDED.holder_mobnb,
    holder_fmlyflgformobnbof = EXCLUDED.holder_fmlyflgformobnbof,
    holder_emailadr = EXCLUDED.holder_emailadr,
    holder_fmlyflgforemailadr = EXCLUDED.holder_fmlyflgforemailadr,
    holder_addmoddelind = EXCLUDED.holder_addmoddelind,
    request_payload = EXCLUDED.request_payload,
    updated_at = NOW()
  RETURNING id, application_id;
`;

module.exports = {
  getNsdlSourceByApplicationIdQuery,
  checkNsdlApplicationIdUniqueIndexQuery,
  upsertNsdlDataByApplicationIdQuery,
};
