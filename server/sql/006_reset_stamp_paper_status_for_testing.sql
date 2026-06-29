UPDATE public.stamp_paper_master
SET
  status = 'AVAILABLE',
  assigned_application_id = NULL,
  assigned_at = NULL,
  used_at = NULL,
  updated_at = NOW()
WHERE status IS NULL OR status <> 'USED';
