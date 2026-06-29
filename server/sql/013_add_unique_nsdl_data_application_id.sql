DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.nsdl_data
    WHERE application_id IS NOT NULL
    GROUP BY application_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot add unique constraint on public.nsdl_data(application_id) because duplicate application_id values already exist.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'nsdl_data'
      AND tc.constraint_name = 'uq_nsdl_data_application_id'
  ) THEN
    ALTER TABLE public.nsdl_data
      ADD CONSTRAINT uq_nsdl_data_application_id UNIQUE (application_id);
  END IF;
END $$;
