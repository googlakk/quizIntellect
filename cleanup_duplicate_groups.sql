-- Удаляем все старые группы и участников для чистоты
DELETE FROM group_members;
DELETE FROM groups;

-- Проверяем, что таблицы пустые
SELECT COUNT(*) as groups_count FROM groups;
SELECT COUNT(*) as members_count FROM group_members;