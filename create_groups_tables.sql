-- Создание таблицы групп
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- Создание таблицы участников групп
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  performance_tier VARCHAR(20) CHECK (performance_tier IN ('high', 'medium', 'low')),
  total_score INTEGER DEFAULT 0,
  average_percentage DECIMAL(5,2) DEFAULT 0,
  UNIQUE(group_id, user_id)
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_is_active ON groups(is_active);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_performance_tier ON group_members(performance_tier);

-- RLS политики
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Политики для таблицы groups
-- Админы могут читать и управлять всеми группами
CREATE POLICY "Admins can manage groups" ON groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Пользователи могут видеть активные группы
CREATE POLICY "Users can view active groups" ON groups
  FOR SELECT USING (is_active = true);

-- Политики для таблицы group_members
-- Админы могут управлять всеми участниками
CREATE POLICY "Admins can manage group members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Пользователи могут видеть записи участия в группах
CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT USING (true);

-- Комментарии к таблицам
COMMENT ON TABLE groups IS 'Таблица групп для балансированного распределения учителей';
COMMENT ON COLUMN groups.group_size IS 'Количество участников в группе';
COMMENT ON COLUMN groups.is_active IS 'Активна ли группа в данный момент';

COMMENT ON TABLE group_members IS 'Таблица участников групп';
COMMENT ON COLUMN group_members.performance_tier IS 'Уровень успеваемости: high (высокий), medium (средний), low (низкий)';
COMMENT ON COLUMN group_members.total_score IS 'Общий балл участника';
COMMENT ON COLUMN group_members.average_percentage IS 'Средний процент правильных ответов';