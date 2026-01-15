
-- Fix user registration by allowing users to insert their own profile
-- This migration adds an INSERT policy for user_profiles and a helper function

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Allow users to insert their own profile (for registration)
-- This is needed in case the trigger doesn't fire or fails
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create a helper function to create/update user profile
-- This function uses SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'client'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (p_user_id, p_email, p_name, p_role)
  ON CONFLICT (id) 
  DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    updated_at = NOW();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated;

