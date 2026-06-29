ALTER TABLE public.kyc_applications
ADD COLUMN IF NOT EXISTS boid VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kyc_applications_boid
ON public.kyc_applications (boid)
WHERE boid IS NOT NULL;
