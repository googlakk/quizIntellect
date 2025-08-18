import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingTests() {
  console.log('🔍 Проверяем существующие тесты...');
  
  // Проверяем все тесты
  const { data: tests, error } = await supabase
    .from('tests')
    .select(`
      id, 
      title, 
      test_type, 
      is_active,
      questions(id),
      assessment_scales(id, label, points)
    `)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Ошибка получения тестов:', error);
    return;
  }
  
  console.log('\n📋 Найдено тестов:', tests.length);
  
  tests.forEach((test, index) => {
    console.log(`\n${index + 1}. ${test.title}`);
    console.log(`   ID: ${test.id}`);
    console.log(`   Тип: ${test.test_type}`);
    console.log(`   Активен: ${test.is_active}`);
    console.log(`   Вопросов: ${test.questions?.length || 0}`);
    
    if (test.test_type === 'assessment') {
      console.log(`   🎯 ОЦЕНОЧНЫЙ ТЕСТ`);
      console.log(`   Шкала оценок: ${test.assessment_scales?.length || 0} вариантов`);
      if (test.assessment_scales?.length > 0) {
        test.assessment_scales.forEach(scale => {
          console.log(`     - ${scale.label}: ${scale.points} баллов`);
        });
      }
      
      if (test.is_active && test.questions?.length > 0) {
        console.log(`   🔗 Готов к тестированию: http://localhost:8082/test/${test.id}`);
      }
    }
  });
  
  // Отдельно показываем оценочные тесты
  const assessmentTests = tests.filter(t => t.test_type === 'assessment');
  console.log(`\n🎯 Оценочных тестов: ${assessmentTests.length}`);
  
  if (assessmentTests.length === 0) {
    console.log('\n❗ Оценочных тестов не найдено. Нужно создать через админ панель.');
    console.log('📝 Шаги для создания:');
    console.log('1. Откройте http://localhost:8082/admin');
    console.log('2. Авторизуйтесь');
    console.log('3. Выберите "Создать тест"');
    console.log('4. Выберите тип "Оценочный тест (самооценка навыков)"');
    console.log('5. Заполните форму и сохраните');
  }
}

checkExistingTests();