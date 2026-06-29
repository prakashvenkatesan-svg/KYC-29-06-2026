INSERT INTO public.nse_data (
  application_id,
  ccd_mem_cd,
  ccd_acct_type,
  ccd_opt_for_upi,
  ccd_cd,
  ccd_name,
  ccd_category,
  ccd_pan_no,
  ccd_seg_ind,
  ccd_dob,
  ccd_add_line1,
  ccd_add_city,
  ccd_add_state,
  ccd_add_country,
  ccd_email,
  ccd_clt_status,
  ccd_permant_add_flg,
  ccd_pin_code,
  ccd_mobile,
  ccd_bank_name,
  ccd_bank_ifsc,
  ccd_bank_acct_no,
  ccd_pri_sec_bnk,
  ccd_depos_name,
  ccd_depos_id,
  ccd_ben_acct_no,
  ccd_pri_sec_dp,
  ccd_ipv,
  ccd_gender,
  ccd_guardian_name,
  ccd_maritl_status,
  ccd_nationality,
  ccd_gros_annl_rnge,
  ccd_gros_annl_asdate,
  ccd_pep,
  ccd_occupation,
  ccd_perm_add_line1,
  ccd_perm_add_line2,
  ccd_perm_add_line3,
  ccd_perm_add_city,
  ccd_perm_add_state,
  ccd_perm_add_country,
  ccd_perm_pin,
  ccd_poa_funds,
  ccd_poa_securities,
  request_payload,
  updated_at
)
SELECT
  source_row.application_id,
  -- TODO: No source table/column currently stores the NSE member code.
  NULL::varchar AS ccd_mem_cd,
  -- TODO: No authoritative source column currently stores the NSE account type.
  NULL::varchar AS ccd_acct_type,
  -- TODO: No authoritative source column currently stores the NSE UPI option.
  NULL::varchar AS ccd_opt_for_upi,
  source_row.source_client_code AS ccd_cd,
  source_row.source_client_name AS ccd_name,
  source_row.source_category AS ccd_category,
  source_row.source_pan_number AS ccd_pan_no,
  -- TODO: No authoritative source column currently stores the NSE segment indicator.
  NULL::char AS ccd_seg_ind,
  TO_CHAR(source_row.source_dob, 'YYYY-MM-DD') AS ccd_dob,
  COALESCE(
    source_row.source_address_line1,
    source_row.source_aadhaar_address,
    source_row.source_digilocker_address
  ) AS ccd_add_line1,
  -- TODO: address_2 looks city-like in sample data but there is no dedicated city column.
  NULL::varchar AS ccd_add_city,
  source_row.source_state AS ccd_add_state,
  -- TODO: No dedicated correspondence-country source column exists today.
  NULL::varchar AS ccd_add_country,
  source_row.source_email AS ccd_email,
  -- TODO: No authoritative source column currently stores the NSE client status.
  NULL::char AS ccd_clt_status,
  -- TODO: No authoritative source column currently determines permanent-address flag.
  NULL::char AS ccd_permant_add_flg,
  source_row.source_pincode AS ccd_pin_code,
  source_row.source_mobile AS ccd_mobile,
  source_row.source_bank_name AS ccd_bank_name,
  source_row.source_bank_ifsc AS ccd_bank_ifsc,
  source_row.source_bank_account_number AS ccd_bank_acct_no,
  NULL::char AS ccd_pri_sec_bnk,
  NULL::varchar AS ccd_depos_name,
  NULL::varchar AS ccd_depos_id,
  source_row.source_boid AS ccd_ben_acct_no,
  NULL::char AS ccd_pri_sec_dp,
  NULL::char AS ccd_ipv,
  source_row.source_gender AS ccd_gender,
  NULL::varchar AS ccd_guardian_name,
  source_row.source_marital_status AS ccd_maritl_status,
  NULL::smallint AS ccd_nationality,
  NULL::smallint AS ccd_gros_annl_rnge,
  NULL::varchar AS ccd_gros_annl_asdate,
  NULL::smallint AS ccd_pep,
  NULL::smallint AS ccd_occupation,
  NULL::varchar AS ccd_perm_add_line1,
  NULL::varchar AS ccd_perm_add_line2,
  NULL::varchar AS ccd_perm_add_line3,
  NULL::varchar AS ccd_perm_add_city,
  NULL::varchar AS ccd_perm_add_state,
  NULL::varchar AS ccd_perm_add_country,
  NULL::varchar AS ccd_perm_pin,
  NULL::char AS ccd_poa_funds,
  NULL::char AS ccd_poa_securities,
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
      'public.client_codes'
    ]
  ) AS request_payload,
  NOW() AS updated_at
FROM (
  SELECT
    ka.id AS application_id,
    NULLIF(BTRIM(cd.email), '') AS source_email,
    NULLIF(BTRIM(cd.mobile_number), '') AS source_mobile,
    NULLIF(BTRIM(COALESCE(iv.pan_number, pv.pan_number)), '') AS source_pan_number,
    iv.dob AS source_dob,
    NULLIF(BTRIM(COALESCE(iv.full_name, pv.full_name, dd.name)), '') AS source_client_name,
    NULLIF(BTRIM(COALESCE(iv.category, pv.category)), '') AS source_category,
    NULLIF(BTRIM(iv.address_1), '') AS source_address_line1,
    NULLIF(BTRIM(iv.state), '') AS source_state,
    NULLIF(BTRIM(iv.pincode), '') AS source_pincode,
    NULLIF(BTRIM(COALESCE(iv.gender, pd.gender)), '') AS source_gender,
    NULLIF(BTRIM(pd.aadhaar_address), '') AS source_aadhaar_address,
    NULLIF(BTRIM(dd.address), '') AS source_digilocker_address,
    NULLIF(BTRIM(bd.account_number), '') AS source_bank_account_number,
    NULLIF(BTRIM(bd.ifsc_code), '') AS source_bank_ifsc,
    NULLIF(BTRIM(bd.bank_name), '') AS source_bank_name,
    NULLIF(BTRIM(cc.client_code), '') AS source_client_code,
    NULLIF(BTRIM(ka.boid), '') AS source_boid,
    NULLIF(BTRIM(pd.marital_status), '') AS source_marital_status
  FROM public.kyc_applications ka
  LEFT JOIN public.contact_details cd
    ON cd.application_id = ka.id
  LEFT JOIN public.identity_verifications iv
    ON iv.application_id = ka.id
  LEFT JOIN public.pan_verifications pv
    ON pv.application_id = ka.id::text
  LEFT JOIN public.personal_details pd
    ON pd.application_id = ka.id
  LEFT JOIN public.bank_details bd
    ON bd.application_id = ka.id
  LEFT JOIN public.digilocker_details dd
    ON dd.application_id = ka.id::text
  LEFT JOIN public.client_codes cc
    ON cc.email = cd.email
   AND cc.pan_number = COALESCE(iv.pan_number, pv.pan_number)
  WHERE ka.id = $1
  ORDER BY cc.created_at DESC NULLS LAST, cc.id DESC
  LIMIT 1
) AS source_row
WHERE application_id = $1
ON CONFLICT (application_id) DO UPDATE SET
  ccd_mem_cd = EXCLUDED.ccd_mem_cd,
  ccd_acct_type = EXCLUDED.ccd_acct_type,
  ccd_opt_for_upi = EXCLUDED.ccd_opt_for_upi,
  ccd_cd = EXCLUDED.ccd_cd,
  ccd_name = EXCLUDED.ccd_name,
  ccd_category = EXCLUDED.ccd_category,
  ccd_pan_no = EXCLUDED.ccd_pan_no,
  ccd_seg_ind = EXCLUDED.ccd_seg_ind,
  ccd_dob = EXCLUDED.ccd_dob,
  ccd_add_line1 = EXCLUDED.ccd_add_line1,
  ccd_add_city = EXCLUDED.ccd_add_city,
  ccd_add_state = EXCLUDED.ccd_add_state,
  ccd_add_country = EXCLUDED.ccd_add_country,
  ccd_email = EXCLUDED.ccd_email,
  ccd_clt_status = EXCLUDED.ccd_clt_status,
  ccd_permant_add_flg = EXCLUDED.ccd_permant_add_flg,
  ccd_pin_code = EXCLUDED.ccd_pin_code,
  ccd_mobile = EXCLUDED.ccd_mobile,
  ccd_bank_name = EXCLUDED.ccd_bank_name,
  ccd_bank_ifsc = EXCLUDED.ccd_bank_ifsc,
  ccd_bank_acct_no = EXCLUDED.ccd_bank_acct_no,
  ccd_pri_sec_bnk = EXCLUDED.ccd_pri_sec_bnk,
  ccd_depos_name = EXCLUDED.ccd_depos_name,
  ccd_depos_id = EXCLUDED.ccd_depos_id,
  ccd_ben_acct_no = EXCLUDED.ccd_ben_acct_no,
  ccd_pri_sec_dp = EXCLUDED.ccd_pri_sec_dp,
  ccd_ipv = EXCLUDED.ccd_ipv,
  ccd_gender = EXCLUDED.ccd_gender,
  ccd_guardian_name = EXCLUDED.ccd_guardian_name,
  ccd_maritl_status = EXCLUDED.ccd_maritl_status,
  ccd_nationality = EXCLUDED.ccd_nationality,
  ccd_gros_annl_rnge = EXCLUDED.ccd_gros_annl_rnge,
  ccd_gros_annl_asdate = EXCLUDED.ccd_gros_annl_asdate,
  ccd_pep = EXCLUDED.ccd_pep,
  ccd_occupation = EXCLUDED.ccd_occupation,
  ccd_perm_add_line1 = EXCLUDED.ccd_perm_add_line1,
  ccd_perm_add_line2 = EXCLUDED.ccd_perm_add_line2,
  ccd_perm_add_line3 = EXCLUDED.ccd_perm_add_line3,
  ccd_perm_add_city = EXCLUDED.ccd_perm_add_city,
  ccd_perm_add_state = EXCLUDED.ccd_perm_add_state,
  ccd_perm_add_country = EXCLUDED.ccd_perm_add_country,
  ccd_perm_pin = EXCLUDED.ccd_perm_pin,
  ccd_poa_funds = EXCLUDED.ccd_poa_funds,
  ccd_poa_securities = EXCLUDED.ccd_poa_securities,
  request_payload = EXCLUDED.request_payload,
  updated_at = NOW();
