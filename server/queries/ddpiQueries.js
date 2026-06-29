const lockApplicationForDdpiQuery = `
  SELECT
    id,
    ddpi_selected,
    ddpi_status,
    stamp_paper_id
  FROM public.kyc_applications
  WHERE id = $1
  FOR UPDATE
`;

const getAvailableStampPaperForAssignmentQuery = `
  SELECT
    id,
    stamp_number,
    image_name,
    image_path,
    status,
    assigned_application_id,
    assigned_at,
    used_at
  FROM public.stamp_paper_master
  WHERE status = 'AVAILABLE'
  ORDER BY id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
`;

const getStampPaperByIdForUpdateQuery = `
  SELECT
    id,
    stamp_number,
    image_name,
    image_path,
    status,
    assigned_application_id,
    assigned_at,
    used_at
  FROM public.stamp_paper_master
  WHERE id = $1
  FOR UPDATE
`;

const reserveStampPaperQuery = `
  UPDATE public.stamp_paper_master
  SET
    status = 'RESERVED',
    assigned_application_id = $1,
    assigned_at = NOW(),
    updated_at = NOW()
  WHERE id = $2
  RETURNING
    id,
    stamp_number,
    image_name,
    image_path,
    status,
    assigned_application_id,
    assigned_at,
    used_at
`;

const releaseStampPaperQuery = `
  UPDATE public.stamp_paper_master
  SET
    status = 'AVAILABLE',
    assigned_application_id = NULL,
    assigned_at = NULL,
    updated_at = NOW()
  WHERE id = $1
  RETURNING
    id,
    stamp_number,
    image_name,
    image_path,
    status,
    assigned_application_id,
    assigned_at,
    used_at
`;

const markStampPaperUsedQuery = `
  UPDATE public.stamp_paper_master
  SET
    status = 'USED',
    used_at = NOW(),
    updated_at = NOW()
  WHERE id = $1
  RETURNING
    id,
    stamp_number,
    image_name,
    image_path,
    status,
    assigned_application_id,
    assigned_at,
    used_at
`;

const updateApplicationDdpiQuery = `
  UPDATE public.kyc_applications
  SET
    ddpi_selected = $1,
    ddpi_status = $2,
    stamp_paper_id = $3,
    updated_at = NOW()
  WHERE id = $4
  RETURNING
    id,
    ddpi_selected,
    ddpi_status,
    stamp_paper_id
`;

const getApplicationDdpiDetailsQuery = `
  SELECT
    ka.id AS application_id,
    COALESCE(ka.ddpi_selected, FALSE) AS ddpi_selected,
    COALESCE(ka.ddpi_status, 'NOT_SELECTED') AS ddpi_status,
    ka.stamp_paper_id,
    spm.stamp_number,
    spm.image_name,
    spm.image_path,
    spm.status AS stamp_status,
    spm.assigned_at,
    spm.used_at
  FROM public.kyc_applications ka
  LEFT JOIN public.stamp_paper_master spm
    ON spm.id = ka.stamp_paper_id
  WHERE ka.id = $1
  LIMIT 1
`;

module.exports = {
  lockApplicationForDdpiQuery,
  getAvailableStampPaperForAssignmentQuery,
  getStampPaperByIdForUpdateQuery,
  reserveStampPaperQuery,
  releaseStampPaperQuery,
  markStampPaperUsedQuery,
  updateApplicationDdpiQuery,
  getApplicationDdpiDetailsQuery,
};
