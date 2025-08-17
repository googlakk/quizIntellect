# Миграция ролей пользователей в Supabase

## Вариант 1: Через SQL Editor в Supabase Dashboard (Рекомендуется)

1. Откройте ваш проект в [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в раздел **SQL Editor**
3. Скопируйте и выполните содержимое файла `add_role_column.sql`

```sql
-- ===================================
-- Миграция для добавления ролей пользователей
-- ===================================

-- 1. Добавляем колонку role в таблицу profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
CHECK (role IN ('admin', 'student'));

-- 2. Устанавливаем первого зарегистрированного пользователя как админа
UPDATE profiles 
SET role = 'admin' 
WHERE user_id = (
  SELECT user_id FROM profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- 3. Устанавливаем всех остальных пользователей как студентов
UPDATE profiles 
SET role = 'student' 
WHERE role IS NULL;

-- 4. Создаем индекс для лучшей производительности
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 5. Проверяем результат
SELECT user_id, full_name, role, created_at 
FROM profiles 
ORDER BY created_at ASC;
```

## Вариант 2: Через Node.js скрипт

1. Создайте файл `.env.local` в корне проекта:
```bash
VITE_SUPABASE_URL=ваш-supabase-url
VITE_SUPABASE_ANON_KEY=ваш-anon-key
SUPABASE_SERVICE_KEY=ваш-service-key  # Необязательно
```

2. Запустите миграцию:
```bash
node migrate.js
```

## Вариант 3: Через Supabase CLI (если установлен)

1. Выполните миграцию:
```bash
supabase db reset
```

## Проверка результата

После выполнения миграции:

1. Перейдите в **Table Editor** → **profiles**
2. Убедитесь, что появилась колонка `role`
3. Проверьте, что у первого пользователя роль `admin`
4. У остальных пользователей должна быть роль `student`

## Структура таблицы profiles после миграции

| Поле | Тип | Описание |
|------|-----|----------|
| user_id | uuid | ID пользователя |
| full_name | text | Полное имя |
| subject | text | Предмет |
| login_username | text | Логин |
| role | text | Роль: 'admin' или 'student' |
| created_at | timestamp | Дата создания |

## Важные примечания

⚠️ **Внимание:** Первый зарегистрированный пользователь автоматически станет администратором.

✅ **Безопасность:** Все административные маршруты защищены на уровне приложения.

🔄 **Обратимость:** Для отката миграции можно выполнить:
```sql
ALTER TABLE profiles DROP COLUMN role;
```