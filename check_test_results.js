import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkTestResults() {
  console.log('🔍 Проверяем результаты тестов в базе данных...\n');

  try {
    // Проверяем все результаты тестов
    const { data: testResults, error: resultsError } = await supabase
      .from('test_results')
      .select(`
        id,
        test_id,
        user_id,
        score,
        max_score,
        percentage,
        time_taken_minutes,
        completed_at,
        tests!inner(title)
      `)
      .order('completed_at', { ascending: false })
      .limit(10);
    
    if (resultsError) {
      console.log('❌ Ошибка при получении результатов тестов:', resultsError.message);
      return;
    }

    if (!testResults || testResults.length === 0) {
      console.log('⚠️  Результаты тестов не найдены');
      console.log('   Возможные причины:');
      console.log('   1. Ни один тест не был завершен');
      console.log('   2. Проблема с сохранением данных при завершении теста');
      console.log('   3. RLS-политики блокируют доступ к данным');
      return;
    }

    console.log(`✅ Найдено ${testResults.length} результатов тестов:`);
    testResults.forEach((result, index) => {
      console.log(`   ${index + 1}. Тест: "${result.tests.title}"`);
      console.log(`      Результат: ${result.score}/${result.max_score} (${Math.round(result.percentage)}%)`);
      console.log(`      Дата: ${new Date(result.completed_at).toLocaleString('ru-RU')}`);
      console.log(`      Время: ${result.time_taken_minutes || 'не указано'} мин`);
      console.log('');
    });

    // Проверяем ответы пользователей
    const { data: userAnswers, error: answersError } = await supabase
      .from('user_answers')
      .select('test_result_id, is_correct, points_earned')
      .limit(5);
    
    if (answersError) {
      console.log('❌ Ошибка при получении ответов пользователей:', answersError.message);
    } else {
      console.log(`✅ Найдено ${userAnswers?.length || 0} ответов пользователей`);
    }

    // Проверяем активные тесты
    const { data: activeTests, error: testsError } = await supabase
      .from('tests')
      .select('id, title, is_active')
      .eq('is_active', true);
    
    if (testsError) {
      console.log('❌ Ошибка при получении тестов:', testsError.message);
    } else {
      console.log(`✅ Найдено ${activeTests?.length || 0} активных тестов`);
    }

  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message);
  }
}

checkTestResults().catch(console.error);