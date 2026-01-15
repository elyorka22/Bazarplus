-- Add store_id to bot_buttons table for store-specific buttons
ALTER TABLE bot_buttons 
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Create index for store_id
CREATE INDEX IF NOT EXISTS idx_bot_buttons_store_id ON bot_buttons(store_id);

-- Update RLS policy to allow store owners to manage their bot buttons
DROP POLICY IF EXISTS "Admins can manage bot buttons" ON bot_buttons;
CREATE POLICY "Admins can manage bot buttons"
  ON bot_buttons FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Store owners can manage their bot buttons"
  ON bot_buttons FOR ALL
  USING (
    store_id IN (
      SELECT id FROM stores WHERE owner_id = auth.uid()
    )
  );

-- Drop and recreate the view policy if it exists (already created in 003_admin_settings.sql)
DROP POLICY IF EXISTS "Anyone can view active bot buttons" ON bot_buttons;
CREATE POLICY "Anyone can view active bot buttons"
  ON bot_buttons FOR SELECT
  USING (is_active = true);

