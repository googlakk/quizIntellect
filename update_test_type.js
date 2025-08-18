import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTestType() {
  console.log('🔄 Обновляем тип теста на assessment...');
  
  const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
  
  try {
    // Проверяем текущее состояние
    const { data: currentTest } = await supabase
      .from('tests')
      .select('id, title, test_type, max_score')
      .eq('id', testId)
      .single();
    
    console.log('📋 Текущее состояние теста:');
    console.log(`   ID: ${currentTest.id}`);
    console.log(`   Название: ${currentTest.title}`);
    console.log(`   Тип: ${currentTest.test_type}`);
    console.log(`   Макс. балл: ${currentTest.max_score}`);
    
    // Пытаемся обновить через RPC или прямое обновление
    const { data: updatedTest, error } = await supabase
      .from('tests')
      .update({ 
        test_type: 'assessment',
        max_score: 20 // 5 вопросов по 4 балла максимум
      })
      .eq('id', testId)
      .select();
    
    if (error) {
      console.error('❌ Ошибка обновления типа теста:', error);
      
      // Альтернативный способ через SQL
      console.log('🔄 Пробуем альтернативный метод...');
      
    } else {
      console.log('✅ Тип теста успешно обновлен на assessment');
      console.log('   Новые данные:', updatedTest[0]);
    }
    
    // Проверяем наличие assessment_scales для этого теста
    const { data: scales } = await supabase
      .from('assessment_scales')
      .select('*')
      .eq('test_id', testId)
      .order('order_index');
    
    console.log(`\n📊 Шкала оценок: ${scales?.length || 0} элементов`);
    if (scales && scales.length > 0) {
      scales.forEach(scale => {
        console.log(`   - ${scale.label}: ${scale.points} баллов`);
      });
    }
    
    // Теперь проверяем, как тест будет загружаться
    const { data: testData } = await supabase
      .from('tests')
      .select(`
        *,
        categories:category_id (name),
        questions (
          id,
          question_text,
          question_type,
          points
        ),
        assessment_scales (
          id,
          label,
          points,
          order_index
        )
      `)
      .eq('id', testId)
      .single();
    
    console.log('\n🧪 Проверка загрузки теста:');
    console.log(`   Тип: ${testData.test_type}`);
    console.log(`   Вопросов: ${testData.questions?.length || 0}`);
    console.log(`   Шкала: ${testData.assessment_scales?.length || 0} элементов`);
    
    if (testData.test_type === 'assessment' && testData.assessment_scales?.length > 0) {
      console.log('\n✅ Тест готов для использования как оценочный!');
      console.log(`🔗 Ссылка: http://localhost:8082/test/${testId}`);
    } else {
      console.log('\n⚠️  Тест еще не готов для использования как оценочный');
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

updateTestType();