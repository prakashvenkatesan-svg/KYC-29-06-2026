DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.nse_data
    WHERE application_id IS NOT NULL
    GROUP BY application_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add unique constraint on public.nse_data(application_id) because duplicate application_id values already exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_nse_data_application_id'
      AND conrelid = 'public.nse_data'::regclass
  ) THEN
    ALTER TABLE public.nse_data
      ADD CONSTRAINT uq_nse_data_application_id UNIQUE (application_id);
  END IF;
END $$;
