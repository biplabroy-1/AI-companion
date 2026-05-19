-- Shared context memory for chat and call flows
ALTER TABLE public.companion_config
ADD COLUMN IF NOT EXISTS shared_context text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.companion_config.shared_context IS 'Rolling shared memory for recent chat and call context.';