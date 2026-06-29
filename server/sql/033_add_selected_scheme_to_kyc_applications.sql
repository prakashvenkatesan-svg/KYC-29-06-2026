ALTER TABLE public.kyc_applications
ADD COLUMN IF NOT EXISTS selected_scheme VARCHAR(32);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'kyc_applications_selected_scheme_check'
  ) THEN
    ALTER TABLE public.kyc_applications
    ADD CONSTRAINT kyc_applications_selected_scheme_check
    CHECK (
      selected_scheme IS NULL OR
      selected_scheme IN ('lifeTime', 'annualCare')
    );
  END IF;
END $$;
