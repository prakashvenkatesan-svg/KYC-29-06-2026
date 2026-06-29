const getExportDetailsByApplicationIdQuery = `
  SELECT
    ka.id AS application_id,
    (
      SELECT row_to_json(nse_row)
      FROM (
        SELECT *
        FROM public.nse_data
        WHERE application_id = ka.id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) AS nse_row
    ) AS nse_data,
    (
      SELECT row_to_json(bse_row)
      FROM (
        SELECT *
        FROM public.bse_data
        WHERE application_id = ka.id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) AS bse_row
    ) AS bse_data,
    (
      SELECT row_to_json(nsdl_row)
      FROM (
        SELECT *
        FROM public.nsdl_data
        WHERE application_id = ka.id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) AS nsdl_row
    ) AS nsdl_data,
    (
      SELECT row_to_json(cdsl_row)
      FROM (
        SELECT *
        FROM public.cdsl_data
        WHERE application_id = ka.id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) AS cdsl_row
    ) AS cdsl_data,
    (
      SELECT row_to_json(mf_row)
      FROM (
        SELECT *
        FROM public.mf_data
        WHERE application_id = ka.id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) AS mf_row
    ) AS mf_data,
    (
      SELECT row_to_json(cvlkra_row)
      FROM (
        SELECT *
        FROM public.cvlkra_data
        WHERE application_id = ka.id
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      ) AS cvlkra_row
    ) AS cvlkra_data
  FROM public.kyc_applications ka
  WHERE ka.id = $1
  LIMIT 1;
`;

module.exports = {
  getExportDetailsByApplicationIdQuery,
};
