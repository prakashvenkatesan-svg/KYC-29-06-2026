ALTER TABLE public.kyc_applications
  ADD COLUMN IF NOT EXISTS completion_email_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_email_sent_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS completion_email_error TEXT NULL;
