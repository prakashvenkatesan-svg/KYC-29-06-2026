SELECT
  ordinal_position,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bse_data'
ORDER BY ordinal_position;
