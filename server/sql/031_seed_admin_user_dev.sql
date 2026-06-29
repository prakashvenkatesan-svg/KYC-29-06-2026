INSERT INTO public.admin_users (
  name,
  email,
  password_hash,
  role,
  is_active
)
VALUES (
  'Default Admin',
  'suganthi.s@coronacreative.in',
  'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7',
  'admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Default development password:
-- Admin@123
