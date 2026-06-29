ALTER TABLE public.kyc_applications
  ADD COLUMN IF NOT EXISTS ddpi_selected BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ddpi_status VARCHAR(30) NOT NULL DEFAULT 'NOT_SELECTED',
  ADD COLUMN IF NOT EXISTS stamp_paper_id BIGINT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'kyc_applications'
      AND constraint_name = 'fk_kyc_stamp_paper'
  ) THEN
    ALTER TABLE public.kyc_applications
      ADD CONSTRAINT fk_kyc_stamp_paper
      FOREIGN KEY (stamp_paper_id)
      REFERENCES public.stamp_paper_master(id);
  END IF;
END $$;
