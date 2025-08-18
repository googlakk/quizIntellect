-- Временно отключаем RLS для отладки
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE group_members DISABLE ROW LEVEL SECURITY;

-- Удаляем все политики
DROP POLICY IF EXISTS "Admins can manage groups" ON groups;
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Admins can manage group members" ON group_members;
DROP POLICY IF EXISTS "Users can view their group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can view group members in their groups" ON group_members;
DROP POLICY IF EXISTS "Users can view active groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;