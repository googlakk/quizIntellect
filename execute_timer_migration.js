import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeTimerMigration() {
  console.log('🔄 Добавляем поле time_limit_seconds в таблицу questions...');
  
  try {
    // Проверяем, есть ли уже поле
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('id, time_limit_seconds')
      .limit(1);
    
    if (existingQuestions && existingQuestions.length > 0 && 'time_limit_seconds' in existingQuestions[0]) {
      console.log('✅ Поле time_limit_seconds уже существует');
    } else {
      console.log('📝 Поле time_limit_seconds отсутствует - требуется добавить через админ панель БД');
    }
    
    // Проверим, работает ли создание вопроса с новым полем
    console.log('\n🧪 Тестируем создание вопроса с таймером...');
    
    // Получаем первый тест
    const { data: tests } = await supabase
      .from('tests')
      .select('id, title, test_type')
      .limit(1);
    
    if (tests && tests.length > 0) {
      const testId = tests[0].id;
      console.log(`📋 Используем тест: ${tests[0].title} (${tests[0].test_type})`);
      
      // Пробуем создать тестовый вопрос
      const questionData = {
        test_id: testId,
        question_text: 'Тестовый вопрос с таймером для проверки функционала',
        question_type: 'single_choice',
        points: 1,
        order_index: 999,
        time_limit_seconds: 30
      };
      
      const { data: newQuestion, error: questionError } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();
      
      if (questionError) {
        console.error('❌ Ошибка создания вопроса:', questionError);
        if (questionError.message.includes('time_limit_seconds')) {
          console.log('📝 Нужно выполнить SQL миграцию для добавления поля time_limit_seconds');
        }
      } else {
        console.log('✅ Вопрос с таймером создан успешно:', newQuestion.id);
        console.log(`   Время: ${newQuestion.time_limit_seconds} секунд`);
        
        // Удаляем тестовый вопрос
        await supabase
          .from('questions')
          .delete()
          .eq('id', newQuestion.id);
        console.log('🗑️ Тестовый вопрос удален');
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка выполнения миграции:', error);
  }
}

executeTimerMigration();