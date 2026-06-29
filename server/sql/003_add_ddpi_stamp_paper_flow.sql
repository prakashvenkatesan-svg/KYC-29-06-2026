CREATE TABLE IF NOT EXISTS public.stamp_paper_master (
  id BIGSERIAL PRIMARY KEY,
  stamp_number VARCHAR(100) NOT NULL UNIQUE,
  image_name VARCHAR(255) NOT NULL,
  image_path VARCHAR(500) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
  assigned_application_id BIGINT NULL,
  assigned_at TIMESTAMP NULL,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
