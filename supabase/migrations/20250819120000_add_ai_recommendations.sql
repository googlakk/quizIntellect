-- Добавляем поле ai_goal в таблицу tests для хранения цели ИИ анализа
ALTER TABLE tests 
ADD COLUMN ai_goal TEXT;

-- Создаем таблицу для хранения ИИ рекомендаций
CREATE TABLE ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_result_id UUID NOT NULL REFERENCES test_results(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  ai_goal TEXT NOT NULL, -- Цель анализа (скопированная из теста на момент прохождения)
  user_answers JSONB NOT NULL, -- Ответы пользователя для анализа
  recommendations TEXT NOT NULL, -- Сгенерированные ИИ рекомендации
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем индексы для оптимизации запросов
CREATE INDEX idx_ai_recommendations_user_id ON ai_recommendations(user_id);
CREATE INDEX idx_ai_recommendations_test_id ON ai_recommendations(test_id);
CREATE INDEX idx_ai_recommendations_test_result_id ON ai_recommendations(test_result_id);
CREATE INDEX idx_ai_recommendations_generated_at ON ai_recommendations(generated_at);

-- Настраиваем RLS (Row Level Security)
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть только свои рекомендации
CREATE POLICY "Users can view their own recommendations" ON ai_recommendations
  FOR SELECT USING (auth.uid() = user_id);

-- Политика: только сервис может создавать рекомендации
CREATE POLICY "Service can insert recommendations" ON ai_recommendations
  FOR INSERT WITH CHECK (true);

-- Политика: админы могут видеть все рекомендации
CREATE POLICY "Admins can view all recommendations" ON ai_recommendations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Добавляем комментарии для документации
COMMENT ON TABLE ai_recommendations IS 'Хранит персонализированные рекомендации ИИ для пользователей на основе результатов тестов';
COMMENT ON COLUMN ai_recommendations.ai_goal IS 'Цель анализа, которая была задана при создании теста';
COMMENT ON COLUMN ai_recommendations.user_answers IS 'JSON с ответами пользователя для контекста рекомендаций';
COMMENT ON COLUMN ai_recommendations.recommendations IS 'Сгенерированные ИИ рекомендации в формате markdown';