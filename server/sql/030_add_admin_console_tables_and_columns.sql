ALTER TABLE public.kyc_applications
  ADD COLUMN IF NOT EXISTS application_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS assigned_rm_id BIGINT,
  ADD COLUMN IF NOT EXISTS assigned_admin_id BIGINT,
  ADD COLUMN IF NOT EXISTS client_code VARCHAR(30),
  ADD COLUMN IF NOT EXISTS trading_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_reviewed_by BIGINT;

UPDATE public.kyc_applications
SET
  application_status = CASE
    WHEN COALESCE(is_completed, FALSE) = TRUE THEN 'completed'
    ELSE 'in_progress'
  END
WHERE application_status IS NULL;

UPDATE public.kyc_applications
SET review_status = 'pending'
WHERE review_status IS NULL;

ALTER TABLE public.kyc_applications
  ALTER COLUMN application_status SET DEFAULT 'in_progress',
  ALTER COLUMN review_status SET DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_check
    CHECK (role IN ('admin', 'maker', 'checker', 'rm'))
);

CREATE TABLE IF NOT EXISTS public.application_review_notes (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL,
  admin_user_id BIGINT,
  note_type TEXT NOT NULL DEFAULT 'general',
  note TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT application_review_notes_note_type_check
    CHECK (note_type IN ('general', 'maker', 'checker')),
  CONSTRAINT fk_review_notes_application
    FOREIGN KEY (application_id) REFERENCES public.kyc_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_review_notes_admin
    FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.application_status_history (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by BIGINT,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_status_history_application
    FOREIGN KEY (application_id) REFERENCES public.kyc_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_status_history_admin
    FOREIGN KEY (changed_by) REFERENCES public.admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.application_assignments (
  id BIGSERIAL PRIMARY KEY,
  application_id BIGINT NOT NULL UNIQUE,
  assigned_to BIGINT,
  assigned_role TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_assignments_application
    FOREIGN KEY (application_id) REFERENCES public.kyc_applications(id) ON DELETE CASCADE,
  CONSTRAINT fk_assignments_admin
    FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_kyc_applications_assigned_rm'
  ) THEN
    ALTER TABLE public.kyc_applications
      ADD CONSTRAINT fk_kyc_applications_assigned_rm
      FOREIGN KEY (assigned_rm_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_kyc_applications_assigned_admin'
  ) THEN
    ALTER TABLE public.kyc_applications
      ADD CONSTRAINT fk_kyc_applications_assigned_admin
      FOREIGN KEY (assigned_admin_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_kyc_applications_last_reviewed_by'
  ) THEN
    ALTER TABLE public.kyc_applications
      ADD CONSTRAINT fk_kyc_applications_last_reviewed_by
      FOREIGN KEY (last_reviewed_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;
