import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function convertTestToAssessment() {
  console.log('🔄 Конвертируем существующий тест в оценочный...');
  
  // Берем первый тест
  const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73'; // Модуль 1: Базовые компьютерные навыки
  
  try {
    // Обновляем тип теста (требует обхода RLS через функцию)
    console.log('📝 Обновляем тип теста...');
    
    // Создаем шкалу оценок для этого теста
    const defaultScales = [
      { label: 'Плохо владею (требуется обучение)', points: 1, order_index: 1 },
      { label: 'Базовые навыки (знаю основы)', points: 2, order_index: 2 },
      { label: 'Хорошо владею (уверенно использую)', points: 3, order_index: 3 },
      { label: 'Отлично владею (эксперт)', points: 4, order_index: 4 }
    ];
    
    const scalesData = defaultScales.map(scale => ({
      ...scale,
      test_id: testId
    }));
    
    console.log('📊 Создаем шкалу оценок...');
    const { data: scales, error: scalesError } = await supabase
      .from('assessment_scales')
      .insert(scalesData)
      .select();
    
    if (scalesError) {
      console.error('❌ Ошибка создания шкалы:', scalesError);
      return;
    }
    
    console.log('✅ Шкала оценок создана:', scales.length, 'элементов');
    
    // Показываем созданную шкалу
    scales.forEach(scale => {
      console.log(`   - ${scale.label}: ${scale.points} баллов`);
    });
    
    console.log('\n✅ Тест готов к использованию как оценочный!');
    console.log(`🔗 ID теста: ${testId}`);
    console.log('📝 Осталось обновить test_type на "assessment" в базе данных');
    console.log('   (это требует админских прав или обновления через админ панель)');
    
  } catch (error) {
    console.error('❌ Ошибка конвертации:', error);
  }
}

convertTestToAssessment();