-- Удаляем проблемные политики
DROP POLICY IF EXISTS "Admins can manage groups" ON groups;
DROP POLICY IF EXISTS "Users can view their groups" ON groups;
DROP POLICY IF EXISTS "Admins can manage group members" ON group_members;
DROP POLICY IF EXISTS "Users can view their group memberships" ON group_members;
DROP POLICY IF EXISTS "Users can view group members in their groups" ON group_members;
DROP POLICY IF EXISTS "Users can view active groups" ON groups;
DROP POLICY IF EXISTS "Users can view group members" ON group_members;

-- Создаем новые политики без рекурсии
CREATE POLICY "Admins can manage groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view active groups" ON groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT USING (true);