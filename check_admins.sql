-- ============================================
-- ПРОВЕРИТЬ ВСЕХ АДМИНОВ В SUPABASE
-- ============================================
-- 
-- Выполните этот код в Supabase SQL Editor
-- чтобы увидеть всех пользователей с ролью 'admin'
--
-- ============================================

-- ВАРИАНТ 1: Показать всех админов (рекомендуется)
SELECT 
  u.id,
  u.email,
  up.name,
  up.role,
  u.email_confirmed_at,
  u.created_at as user_created,
  up.created_at as profile_created,
  up.updated_at as profile_updated
FROM auth.users u
INNER JOIN public.user_profiles up ON u.id = up.id
WHERE up.role = 'admin'
ORDER BY up.created_at DESC;

-- ============================================
-- ВАРИАНТ 2: Проверить конкретного пользователя по email
-- ============================================
-- Раскомментируйте и замените email:
/*
SELECT 
  u.id,
  u.email,
  up.name,
  up.role,
  CASE 
    WHEN up.role = 'admin' THEN '✅ Админ'
    WHEN up.role = 'store' THEN '🏪 Магазин'
    WHEN up.role = 'client' THEN '👤 Клиент'
    ELSE '❓ Неизвестно'
  END as role_status,
  u.email_confirmed_at,
  up.created_at,
  up.updated_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'esalimov022@gmail.com';  -- ЗАМЕНИТЕ НА EMAIL
*/

-- ============================================
-- ВАРИАНТ 3: Проверить конкретного пользователя по UUID
-- ============================================
-- Раскомментируйте и замените UUID:
/*
SELECT 
  u.id,
  u.email,
  up.name,
  up.role,
  CASE 
    WHEN up.role = 'admin' THEN '✅ Админ'
    WHEN up.role = 'store' THEN '🏪 Магазин'
    WHEN up.role = 'client' THEN '👤 Клиент'
    ELSE '❓ Неизвестно'
  END as role_status,
  u.email_confirmed_at,
  up.created_at,
  up.updated_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.id = '7304d1a3-7120-4702-9476-0628c6149039'::uuid;  -- ЗАМЕНИТЕ НА UUID
*/

-- ============================================
-- ВАРИАНТ 4: Показать всех пользователей с их ролями
-- ============================================
-- Раскомментируйте, чтобы увидеть всех пользователей:
/*
SELECT 
  u.email,
  up.name,
  up.role,
  CASE 
    WHEN up.role = 'admin' THEN '✅ Админ'
    WHEN up.role = 'store' THEN '🏪 Магазин'
    WHEN up.role = 'client' THEN '👤 Клиент'
    WHEN up.role IS NULL THEN '⚠️ Профиль не создан'
    ELSE '❓ Неизвестно'
  END as role_status,
  u.email_confirmed_at,
  u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
ORDER BY 
  CASE up.role
    WHEN 'admin' THEN 1
    WHEN 'store' THEN 2
    WHEN 'client' THEN 3
    ELSE 4
  END,
  u.created_at DESC;
*/

