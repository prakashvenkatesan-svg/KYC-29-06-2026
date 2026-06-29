ALTER TABLE public.identity_verifications
ADD COLUMN IF NOT EXISTS kra_raw_xml TEXT;

ALTER TABLE public.digilocker_details
ADD COLUMN IF NOT EXISTS digilocker_raw_xml TEXT;
