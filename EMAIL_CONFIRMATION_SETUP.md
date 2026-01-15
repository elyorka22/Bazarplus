# Настройка подтверждения Email

## Проблема: "Email not confirmed"

Если вы получаете ошибку "Email not confirmed" при попытке войти, это означает, что в Supabase включено требование подтверждения email.

## Решение 1: Отключить требование подтверждения (для разработки/тестирования)

1. Откройте **Supabase Dashboard**
2. Перейдите в **Authentication** → **Settings**
3. Найдите раздел **"Email Auth"**
4. Отключите опцию **"Enable email confirmations"**
5. Сохраните изменения

## Решение 2: Автоматическое подтверждение через триггер (рекомендуется)

Миграция `010_disable_email_confirmation.sql` создает триггер, который автоматически подтверждает email при регистрации.

**Примените миграцию:**
1. Откройте **Supabase Dashboard** → **SQL Editor**
2. Выполните содержимое файла `supabase/migrations/010_disable_email_confirmation.sql`

## Решение 3: Подтверждение через email (для продакшена)

Если вы хотите использовать подтверждение email в продакшене:

1. Включите **"Enable email confirmations"** в настройках Supabase
2. Настройте SMTP в **Authentication** → **Settings** → **SMTP Settings**
3. Пользователи будут получать письма с подтверждением
4. После клика по ссылке в письме они смогут войти

## Проверка текущих настроек

Выполните этот SQL запрос в Supabase SQL Editor, чтобы проверить, подтверждены ли email пользователей:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;
```

## Ручное подтверждение пользователя

Если нужно подтвердить email конкретного пользователя вручную:

```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'user@example.com';
```

