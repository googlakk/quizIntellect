-- Проверяем существование таблиц
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members');

-- Проверяем структуру таблиц, если они есть
\d groups;
\d group_members;

-- Проверяем политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('groups', 'group_members');