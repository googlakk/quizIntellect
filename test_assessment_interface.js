import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAssessmentInterface() {
  console.log('🧪 Тестируем интерфейс оценочного теста...');
  
  const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
  
  try {
    // Получаем данные теста как это делает TakeTest.tsx
    const { data, error } = await supabase
      .from('tests')
      .select(`
        *,
        categories:category_id (name),
        questions (
          *,
          answer_options (
            id,
            option_text,
            order_index,
            is_correct
          )
        ),
        assessment_scales (
          id,
          label,
          points,
          order_index
        )
      `)
      .eq('id', testId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('❌ Ошибка получения теста:', error);
      return;
    }
    
    console.log('\n📋 Информация о тесте:');
    console.log(`   Название: ${data.title}`);
    console.log(`   Тип: ${data.test_type}`);
    console.log(`   Максимальный балл: ${data.max_score}`);
    console.log(`   Вопросов: ${data.questions?.length || 0}`);
    console.log(`   Шкала оценок: ${data.assessment_scales?.length || 0} вариантов`);
    
    if (data.assessment_scales && data.assessment_scales.length > 0) {
      console.log('\n📊 Шкала оценок:');
      data.assessment_scales
        .sort((a, b) => a.order_index - b.order_index)
        .forEach(scale => {
          console.log(`   ${scale.order_index}. ${scale.label} - ${scale.points} баллов`);
        });
      
      // Симулируем выбор оценок для каждого вопроса
      console.log('\n🎯 Симуляция прохождения оценочного теста:');
      let totalScore = 0;
      const maxPossibleScore = data.questions.length * 4; // 4 - максимальный балл по шкале
      
      data.questions.forEach((question, index) => {
        // Случайно выбираем оценку от 2 до 4 (имитируем реального пользователя)
        const randomScaleIndex = Math.floor(Math.random() * 3) + 1; // 1-3, потом добавим 1
        const selectedScale = data.assessment_scales[randomScaleIndex];
        totalScore += selectedScale.points;
        
        console.log(`   Вопрос ${index + 1}: ${question.question_text.substring(0, 50)}...`);
        console.log(`   Ответ: "${selectedScale.label}" (${selectedScale.points} баллов)`);
      });
      
      const percentage = Math.round((totalScore / maxPossibleScore) * 100);
      console.log(`\n🎉 Результат симуляции:`);
      console.log(`   Набрано баллов: ${totalScore} из ${maxPossibleScore}`);
      console.log(`   Процент: ${percentage}%`);
      console.log(`   Это будет показано как самооценка навыков`);
      
      console.log(`\n🔗 Ссылка для тестирования: http://localhost:8082/test/${testId}`);
      
    } else {
      console.log('\n❌ Шкала оценок не найдена');
    }
    
    // Проверяем, правильно ли работает логика в TakeTest
    if (data.test_type === 'assessment' && data.assessment_scales) {
      console.log('\n✅ Тест корректно определен как оценочный');
      console.log('✅ Шкала оценок доступна');
      console.log('✅ Интерфейс будет показывать оценочные варианты вместо обычных ответов');
    } else {
      console.log('\n⚠️  Тест все еще имеет тип "quiz" - нужно обновить test_type');
    }
    
  } catch (error) {
    console.error('❌ Ошибка тестирования:', error);
  }
}

testAssessmentInterface();