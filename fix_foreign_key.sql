-- Удаляем старое ограничение внешнего ключа
ALTER TABLE group_members 
DROP CONSTRAINT IF EXISTS group_members_user_id_fkey;

-- Добавляем правильное ограничение внешнего ключа
ALTER TABLE group_members 
ADD CONSTRAINT group_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE;