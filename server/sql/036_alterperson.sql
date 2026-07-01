ALTER TABLE public.personal_details
  ADD COLUMN IF NOT EXISTS depository_credit_instruction VARCHAR(3),
  ADD COLUMN IF NOT EXISTS pledge_instruction VARCHAR(3),
  ADD COLUMN IF NOT EXISTS account_statement_requirement VARCHAR(20),
  ADD COLUMN IF NOT EXISTS electronic_transaction_statement VARCHAR(3),
  ADD COLUMN IF NOT EXISTS share_email_with_rta VARCHAR(3),
  ADD COLUMN IF NOT EXISTS annual_report_preference VARCHAR(35),
  ADD COLUMN IF NOT EXISTS dividend_interest_ecs VARCHAR(3),
  ADD COLUMN IF NOT EXISTS contract_note_preference VARCHAR(12),
  ADD COLUMN IF NOT EXISTS trust_facility_instruction VARCHAR(3),
  ADD COLUMN IF NOT EXISTS dis_at_account_opening VARCHAR(3),
  ADD COLUMN IF NOT EXISTS standing_instruction_completed BOOLEAN NOT NULL DEFAULT FALSE;