// Скрипт для проверки доступности Edge функции
const { createClient } = require('@supabase/supabase-js');

// Замените на ваши реальные URL и ключи
const SUPABASE_URL = 'your_supabase_url';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testEdgeFunction() {
  console.log('🔍 Тестируем Edge функцию generate-ai-recommendations...');
  
  try {
    // Тестовые данные
    const testData = {
      testResultId: 'test-result-id',
      userId: 'test-user-id', 
      testId: 'test-id',
      aiGoal: 'Тестовая цель ИИ анализа',
      userAnswers: [
        { question: 'Тест', answer: 'Ответ', points: 1 }
      ],
      testData: {
        title: 'Тестовый тест',
        description: 'Описание',
        questions: [
          { question_text: 'Тест' }
        ]
      },
      userProfile: {
        full_name: 'Тестовый Пользователь'
      }
    };

    console.log('📤 Отправляем тестовый запрос...');
    
    const { data, error } = await supabase.functions.invoke('generate-ai-recommendations', {
      body: testData
    });

    if (error) {
      console.error('❌ Ошибка Edge функции:', error);
      console.log('\n🔧 Возможные решения:');
      console.log('1. Проверьте, развернута ли функция: supabase functions list');
      console.log('2. Разверните функцию: supabase functions deploy generate-ai-recommendations');
      console.log('3. Проверьте переменные окружения в Supabase Dashboard');
    } else {
      console.log('✅ Edge функция доступна!');
      console.log('📋 Ответ:', data);
    }

  } catch (err) {
    console.error('❌ Критическая ошибка:', err.message);
    console.log('\n🔧 Проверьте:');
    console.log('1. URL и ключи Supabase в коде');
    console.log('2. Подключение к интернету');
    console.log('3. Статус проекта Supabase');
  }
}

console.log('⚠️  Внимание: Обновите SUPABASE_URL и SUPABASE_ANON_KEY в файле check-edge-function.js');
console.log('🎯 Запуск теста...\n');

// Раскомментируйте после обновления переменных
// testEdgeFunction();

module.exports = { testEdgeFunction };