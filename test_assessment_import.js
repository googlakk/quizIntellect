import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAssessmentImport() {
  console.log('🧪 Тестируем импорт оценочного теста...');
  
  try {
    // Читаем JSON файл
    const testData = JSON.parse(fs.readFileSync('example-assessment-test.json', 'utf8'));
    console.log('📁 JSON файл загружен:', testData.title);
    console.log(`   Тип: ${testData.test_type}`);
    console.log(`   Вопросов: ${testData.questions.length}`);
    console.log(`   Уровней оценки: ${testData.assessment_scales?.length || 0}`);
    
    // Симулируем импорт
    
    // 1. Проверяем/создаем категорию
    console.log('\n📂 Проверяем категорию...');
    let categoryId;
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', testData.category)
      .single();
    
    if (existingCategory) {
      categoryId = existingCategory.id;
      console.log('✅ Категория найдена');
    } else {
      const { data: newCategory, error: categoryError } = await supabase
        .from('categories')
        .insert({
          name: testData.category,
          description: `Автоматически создана при импорте теста "${testData.title}"`
        })
        .select('id')
        .single();
      
      if (categoryError) throw categoryError;
      categoryId = newCategory.id;
      console.log('✅ Категория создана');
    }
    
    // 2. Создаем тест
    console.log('\n📝 Создаем тест...');
    const maxScore = testData.questions.length * Math.max(...testData.assessment_scales.map(s => s.points));
    
    const { data: test, error: testError } = await supabase
      .from('tests')
      .insert({
        title: testData.title,
        description: testData.description,
        category_id: categoryId,
        time_limit_minutes: testData.time_limit_minutes,
        max_score: maxScore,
        test_type: testData.test_type,
        is_active: true
      })
      .select('id')
      .single();
    
    if (testError) throw testError;
    console.log('✅ Тест создан:', test.id);
    console.log(`   Максимальный балл: ${maxScore}`);
    
    // 3. Создаем шкалу оценок
    console.log('\n📊 Создаем шкалу оценок...');
    const scalesData = testData.assessment_scales.map((scale, index) => ({
      test_id: test.id,
      label: scale.label,
      points: scale.points,
      order_index: scale.order_index !== undefined ? scale.order_index : index
    }));
    
    const { error: scalesError } = await supabase
      .from('assessment_scales')
      .insert(scalesData);
    
    if (scalesError) throw scalesError;
    console.log('✅ Шкала оценок создана');
    testData.assessment_scales.forEach((scale, index) => {
      console.log(`   ${index + 1}. ${scale.label}: ${scale.points} баллов`);
    });
    
    // 4. Создаем вопросы
    console.log('\n❓ Создаем вопросы...');
    const questionPoints = Math.max(...testData.assessment_scales.map(s => s.points));
    
    for (let i = 0; i < testData.questions.length; i++) {
      const questionData = testData.questions[i];
      
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .insert({
          test_id: test.id,
          question_text: questionData.question_text,
          question_type: questionData.question_type,
          points: questionPoints,
          order_index: i
        })
        .select('id')
        .single();
      
      if (questionError) throw questionError;
      
      console.log(`✅ Вопрос ${i + 1}: ${questionData.question_text.substring(0, 50)}...`);
    }
    
    console.log('\n🎉 ИМПОРТ ЗАВЕРШЕН УСПЕШНО!');
    console.log(`🔗 ID теста: ${test.id}`);
    console.log(`📝 Название: ${testData.title}`);
    console.log(`🎯 Тип: Оценочный тест`);
    console.log(`❓ Вопросов: ${testData.questions.length}`);
    console.log(`📊 Уровней оценки: ${testData.assessment_scales.length}`);
    console.log(`💯 Макс. баллов: ${maxScore}`);
    console.log(`🔗 Ссылка для прохождения: http://localhost:8082/test/${test.id}`);
    
    // Проверяем полученный тест
    console.log('\n🔍 Проверяем созданный тест...');
    const { data: createdTest } = await supabase
      .from('tests')
      .select(`
        *,
        questions (id, question_text, points),
        assessment_scales (id, label, points, order_index)
      `)
      .eq('id', test.id)
      .single();
    
    if (createdTest) {
      console.log('✅ Тест успешно создан и проверен');
      console.log(`   Тип теста: ${createdTest.test_type}`);
      console.log(`   Вопросов в БД: ${createdTest.questions?.length || 0}`);
      console.log(`   Шкала в БД: ${createdTest.assessment_scales?.length || 0} уровней`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка импорта:', error);
  }
}

testAssessmentImport();