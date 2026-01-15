-- Disable email confirmation requirement for development/production
-- This allows users to sign in immediately after registration
--
-- Note: This is a SQL migration, but email confirmation settings
-- are typically configured in Supabase Dashboard > Authentication > Settings
--
-- However, we can create a function to auto-confirm users on signup

-- Function to auto-confirm user email on signup
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-confirm the user's email
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-confirm users
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NULL)
  EXECUTE FUNCTION public.auto_confirm_user();

