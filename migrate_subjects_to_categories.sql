-- ===================================
-- Миграция: переименование subjects в categories
-- ===================================

-- 1. Переименовываем таблицу subjects в categories
ALTER TABLE subjects RENAME TO categories;

-- 2. Переименовываем колонку subject_id в category_id в таблице tests
ALTER TABLE tests RENAME COLUMN subject_id TO category_id;

-- 3. Переименовываем индексы и ограничения
ALTER INDEX IF EXISTS subjects_pkey RENAME TO categories_pkey;
ALTER INDEX IF EXISTS idx_subjects_name RENAME TO idx_categories_name;

-- 4. Обновляем внешние ключи
ALTER TABLE tests 
DROP CONSTRAINT IF EXISTS tests_subject_id_fkey;

ALTER TABLE tests 
ADD CONSTRAINT tests_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id);

-- 5. Переименовываем колонку subject в category в таблице profiles (если есть)
ALTER TABLE profiles RENAME COLUMN subject TO category;

-- 6. Добавляем примеры разделов
INSERT INTO categories (name, description) VALUES 
('Компьютерная грамотность', 'Основы работы с компьютером, программами и интернетом'),
('Цифровая гигиена', 'Безопасность в интернете, защита данных и конфиденциальность'),
('Медиаграмотность', 'Критическое мышление при работе с информацией и медиаконтентом'),
('Кибербезопасность', 'Защита от киберугроз и безопасное поведение в сети'),
('Цифровая этика', 'Этические аспекты использования цифровых технологий')
ON CONFLICT (name) DO NOTHING;

-- 7. Проверяем результат
SELECT id, name, description FROM categories ORDER BY name;