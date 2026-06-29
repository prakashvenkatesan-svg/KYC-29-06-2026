ALTER TABLE public.kyc_applications
  ADD COLUMN IF NOT EXISTS esign_document_id TEXT,
  ADD COLUMN IF NOT EXISTS esign_request_id TEXT,
  ADD COLUMN IF NOT EXISTS esign_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS esign_redirect_url TEXT,
  ADD COLUMN IF NOT EXISTS esign_last_provider_message TEXT,
  ADD COLUMN IF NOT EXISTS esign_signed_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS esign_signed_at TIMESTAMP WITHOUT TIME ZONE;
