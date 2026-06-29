CREATE TABLE IF NOT EXISTS public.application_compliance_documents (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL,
  document_type TEXT NOT NULL,
  uploaded_by_type TEXT NOT NULL DEFAULT 'admin',
  uploaded_by_id BIGINT NULL,
  file_name TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  review_status VARCHAR(30) NOT NULL DEFAULT 'uploaded',
  review_remark TEXT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP NULL,
  reviewed_by BIGINT NULL,
  CONSTRAINT application_compliance_documents_uploaded_by_type_check
    CHECK (uploaded_by_type IN ('user', 'admin')),
  CONSTRAINT application_compliance_documents_review_status_check
    CHECK (review_status IN ('pending', 'uploaded', 'under_review', 'approved', 'rejected')),
  CONSTRAINT fk_application_compliance_documents_application
    FOREIGN KEY (application_id) REFERENCES public.kyc_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_application_compliance_documents_uploaded_by
    FOREIGN KEY (uploaded_by_id) REFERENCES public.admin_users(id) ON DELETE SET NULL,
  CONSTRAINT fk_application_compliance_documents_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES public.admin_users(id) ON DELETE SET NULL
);
