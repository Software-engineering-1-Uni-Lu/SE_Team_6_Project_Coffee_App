-- Add blocked field to profiles table for account management
ALTER TABLE public.profiles 
ADD COLUMN blocked BOOLEAN NOT NULL DEFAULT false;

-- Add index for performance when checking blocked status
CREATE INDEX idx_profiles_blocked ON public.profiles(blocked) WHERE blocked = true;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.blocked IS 'Whether the account is blocked by admin (prevents login and access)';
