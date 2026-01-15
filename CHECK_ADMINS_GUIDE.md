# 📘 Как проверить админов в Supabase

## Способ 1: Через SQL Editor (Рекомендуется)

### Шаг 1: Откройте SQL Editor
1. Войдите в **Supabase Dashboard**
2. Перейдите в **SQL Editor** (в левом меню)
3. Нажмите **"New Query"**

### Шаг 2: Выполните SQL запрос

Скопируйте и выполните этот код:

```sql
-- Показать всех админов
SELECT 
  u.id,
  u.email,
  up.name,
  up.role,
  u.email_confirmed_at,
  u.created_at as user_created,
  up.created_at as profile_created
FROM auth.users u
INNER JOIN public.user_profiles up ON u.id = up.id
WHERE up.role = 'admin'
ORDER BY up.created_at DESC;
```

### Результат:
Вы увидите список всех пользователей с ролью `'admin'`:
- **id** - UUID пользователя
- **email** - Email админа
- **name** - Имя админа
- **role** - Роль (должно быть `'admin'`)
- **email_confirmed_at** - Дата подтверждения email
- **user_created** - Когда создан пользователь
- **profile_created** - Когда создан профиль

---

## Способ 2: Проверить конкретного пользователя

### По Email:
```sql
SELECT 
  u.email,
  up.name,
  up.role,
  CASE 
    WHEN up.role = 'admin' THEN '✅ Админ'
    WHEN up.role = 'store' THEN '🏪 Магазин'
    WHEN up.role = 'client' THEN '👤 Клиент'
    ELSE '❓ Неизвестно'
  END as role_status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'esalimov022@gmail.com';  -- Замените на нужный email
```

### По UUID:
```sql
SELECT 
  u.email,
  up.name,
  up.role
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.id = '7304d1a3-7120-4702-9476-0628c6149039'::uuid;  -- Замените на UUID
```

---

## Способ 3: Через Supabase Dashboard

### Проверить через Authentication:
1. Откройте **Authentication** → **Users**
2. Найдите пользователя по email
3. Нажмите на пользователя
4. Посмотрите в **"User Metadata"** → **"role"**

**⚠️ Внимание:** Роль в метаданных (`raw_user_meta_data->>'role'`) может отличаться от реальной роли в таблице `user_profiles`!

### Проверить через Table Editor:
1. Откройте **Table Editor**
2. Выберите таблицу **`user_profiles`**
3. Отфильтруйте по `role = 'admin'`
4. Вы увидите всех админов

---

## Способ 4: Показать всех пользователей с ролями

```sql
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
  u.email_confirmed_at
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
```

---

## ⚠️ Важно помнить:

1. **Роль хранится в таблице `user_profiles`**, а не в `auth.users`
2. **Метаданные** (`raw_user_meta_data->>'role'`) могут отличаться от реальной роли
3. **Всегда проверяйте** `user_profiles.role` для точной информации

---

## Быстрая проверка (один запрос):

```sql
-- Быстро проверить, является ли пользователь админом
SELECT 
  CASE 
    WHEN up.role = 'admin' THEN '✅ ДА, это админ'
    ELSE '❌ НЕТ, роль: ' || COALESCE(up.role, 'не установлена')
  END as is_admin
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
WHERE u.email = 'esalimov022@gmail.com';  -- Замените на email
```

