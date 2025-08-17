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