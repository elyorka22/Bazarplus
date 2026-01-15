-- ============================================
-- ИСПРАВИТЬ RLS ПОЛИТИКИ ДЛЯ ИСПРАВЛЕНИЯ ОШИБОК 500
-- ============================================
-- 
-- Эта миграция исправляет RLS политики, которые вызывают ошибки 500
--
-- ============================================

-- ШАГ 1: Исправить политики для user_profiles
-- Убедиться, что пользователи могут читать свой профиль

DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Политика для админов (используем функцию для избежания рекурсии)
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Создать функцию для проверки, является ли пользователь админом
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Создать политику для админов
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- ШАГ 2: Убедиться, что политики для banners существуют
-- (должны быть в 003_admin_settings.sql, но проверим)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'banners' 
    AND policyname = 'Anyone can view active banners'
  ) THEN
    CREATE POLICY "Anyone can view active banners"
      ON banners FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- ШАГ 3: Убедиться, что политики для product_categories существуют
-- (должны быть в 005_product_categories.sql, но проверим)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'product_categories' 
    AND policyname = 'Anyone can view active categories'
  ) THEN
    CREATE POLICY "Anyone can view active categories"
      ON product_categories FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- ШАГ 4: Убедиться, что политики для products существуют
-- (должны быть в 001_initial_schema.sql, но проверим)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' 
    AND policyname = 'Anyone can view active products'
  ) THEN
    CREATE POLICY "Anyone can view active products"
      ON products FOR SELECT
      USING (is_active = true);
  END IF;
END $$;

-- ШАГ 5: Убедиться, что политики для cart_items существуют
-- (должны быть в 001_initial_schema.sql, но проверим)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'cart_items' 
    AND policyname = 'Users can view their own cart items'
  ) THEN
    CREATE POLICY "Users can view their own cart items"
      ON cart_items FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ШАГ 6: Создать профиль для пользователя, если его нет
-- (это поможет, если профиль не был создан триггером)

INSERT INTO public.user_profiles (id, email, name, role)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', 'User'),
  COALESCE(raw_user_meta_data->>'role', 'client')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

