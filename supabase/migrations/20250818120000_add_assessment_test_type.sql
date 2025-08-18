-- Добавляем новый тип теста "assessment" для оценочных тестов
ALTER TABLE tests 
ADD COLUMN test_type VARCHAR(20) DEFAULT 'quiz' CHECK (test_type IN ('quiz', 'assessment'));

-- Добавляем таблицу для хранения шкалы оценок для оценочных тестов
CREATE TABLE assessment_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  label VARCHAR(255) NOT NULL, -- Например: "Плохо владею", "Хорошо владею"
  points INTEGER NOT NULL,      -- Количество баллов за этот вариант
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_assessment_scales_test_id ON assessment_scales(test_id);
CREATE INDEX idx_assessment_scales_order ON assessment_scales(test_id, order_index);

-- Изменяем структуру вопросов для поддержки оценочного типа
ALTER TABLE questions 
ADD COLUMN question_type_enum VARCHAR(20) DEFAULT 'multiple_choice' 
CHECK (question_type_enum IN ('multiple_choice', 'assessment_scale'));

-- Комментарии
COMMENT ON COLUMN tests.test_type IS 'Тип теста: quiz (обычный) или assessment (оценочный)';
COMMENT ON TABLE assessment_scales IS 'Шкала оценок для оценочных тестов (например: плохо владею - 1 балл)';
COMMENT ON COLUMN assessment_scales.label IS 'Текст варианта ответа (например: "Отлично владею")';
COMMENT ON COLUMN assessment_scales.points IS 'Количество баллов за выбор этого варианта';
COMMENT ON COLUMN questions.question_type_enum IS 'Тип вопроса: multiple_choice или assessment_scale';