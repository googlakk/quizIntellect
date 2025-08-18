import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAssessmentTest() {
  console.log('🧪 Тестируем создание оценочного теста...');
  
  try {
    // Получаем первую доступную категорию
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .limit(1);
    
    if (!categories || categories.length === 0) {
      console.error('❌ Нет доступных категорий');
      return;
    }
    
    console.log('📁 Используем категорию:', categories[0].name);
    
    // Создаем тест
    const testData = {
      title: 'Тестовый оценочный тест - Навыки программирования',
      description: 'Оцените свой уровень владения различными аспектами программирования',
      category_id: categories[0].id,
      time_limit_minutes: null,
      max_score: 16, // 4 вопроса по 4 балла максимум
      is_active: true,
      test_type: 'assessment'
    };
    
    console.log('📝 Создаем тест...');
    const { data: createdTest, error: testError } = await supabase
      .from('tests')
      .insert(testData)
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Ошибка создания теста:', testError);
      return;
    }
    
    console.log('✅ Тест создан:', createdTest.id);
    
    // Создаем шкалу оценок
    const defaultScales = [
      { label: 'Плохо владею', points: 1, order_index: 1 },
      { label: 'Нормально владею', points: 2, order_index: 2 },
      { label: 'Хорошо владею', points: 3, order_index: 3 },
      { label: 'Отлично владею', points: 4, order_index: 4 }
    ];
    
    const scalesData = defaultScales.map(scale => ({
      ...scale,
      test_id: createdTest.id
    }));
    
    console.log('📊 Создаем шкалу оценок...');
    const { error: scalesError } = await supabase
      .from('assessment_scales')
      .insert(scalesData);
    
    if (scalesError) {
      console.error('❌ Ошибка создания шкалы:', scalesError);
      return;
    }
    
    console.log('✅ Шкала оценок создана');
    
    // Создаем тестовые вопросы
    const questions = [
      'Как вы оцениваете свои навыки работы с JavaScript?',
      'Как вы оцениваете свои навыки работы с React?',
      'Как вы оцениваете свои навыки работы с базами данных?',
      'Как вы оцениваете свои навыки алгоритмического мышления?'
    ];
    
    console.log('❓ Создаем вопросы...');
    for (let i = 0; i < questions.length; i++) {
      const questionData = {
        test_id: createdTest.id,
        question_text: questions[i],
        question_type: 'single_choice',
        points: 4, // Максимальные баллы
        order_index: i + 1
      };
      
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();
      
      if (questionError) {
        console.error(`❌ Ошибка создания вопроса ${i + 1}:`, questionError);
        continue;
      }
      
      console.log(`✅ Вопрос ${i + 1} создан:`, question.id);
    }
    
    console.log('🎉 Оценочный тест полностью создан!');
    console.log(`🔗 ID теста: ${createdTest.id}`);
    console.log(`📝 Название: ${createdTest.title}`);
    console.log(`🔗 Ссылка: http://localhost:8082/test/${createdTest.id}`);
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

createAssessmentTest();