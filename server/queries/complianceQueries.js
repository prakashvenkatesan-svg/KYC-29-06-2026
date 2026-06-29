const { getApplicationById } = require("./personalDetailsQueries");

const listComplianceDocumentsQuery = `
  SELECT
    acd.id,
    acd.application_id,
    acd.document_type,
    acd.uploaded_by_type,
    acd.uploaded_by_id,
    acd.file_name,
    acd.original_file_name,
    acd.file_path,
    acd.mime_type,
    acd.file_size,
    acd.review_status,
    acd.review_remark,
    acd.uploaded_at,
    acd.reviewed_at,
    acd.reviewed_by,
    uploader.name AS uploaded_by_name,
    uploader.email AS uploaded_by_email,
    reviewer.name AS reviewed_by_name,
    reviewer.email AS reviewed_by_email
  FROM public.application_compliance_documents acd
  LEFT JOIN public.admin_users uploader
    ON uploader.id = acd.uploaded_by_id AND acd.uploaded_by_type = 'admin'
  LEFT JOIN public.admin_users reviewer
    ON reviewer.id = acd.reviewed_by
  WHERE acd.application_id = $1
  ORDER BY acd.uploaded_at DESC, acd.id DESC;
`;

const insertComplianceDocumentQuery = `
  INSERT INTO public.application_compliance_documents (
    application_id,
    document_type,
    uploaded_by_type,
    uploaded_by_id,
    file_name,
    original_file_name,
    file_path,
    mime_type,
    file_size,
    review_status,
    uploaded_at
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'uploaded', NOW())
  RETURNING *;
`;

const getComplianceDocumentByIdQuery = `
  SELECT id, application_id, review_status
  FROM public.application_compliance_documents
  WHERE id = $1
  LIMIT 1;
`;

const updateComplianceDocumentReviewQuery = `
  UPDATE public.application_compliance_documents
  SET
    review_status = $1,
    review_remark = $2,
    reviewed_by = $3,
    reviewed_at = NOW()
  WHERE id = $4
  RETURNING *;
`;

module.exports = {
  getApplicationById,
  listComplianceDocumentsQuery,
  insertComplianceDocumentQuery,
  getComplianceDocumentByIdQuery,
  updateComplianceDocumentReviewQuery,
};
