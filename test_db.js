import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  console.log('🔍 Проверяем структуру базы данных...');
  
  // Проверяем структуру таблицы tests
  console.log('\n1. Проверяем таблицу tests...');
  const { data: tests, error: testsError } = await supabase
    .from('tests')
    .select('id, title, test_type')
    .limit(1);
    
  if (testsError) {
    console.error('❌ Ошибка при проверке tests:', testsError);
  } else {
    console.log('✅ Таблица tests доступна');
    console.log('   Примерная структура:', tests[0] || 'Нет записей');
  }
  
  // Проверяем наличие таблицы assessment_scales
  console.log('\n2. Проверяем таблицу assessment_scales...');
  const { data: scales, error: scalesError } = await supabase
    .from('assessment_scales')
    .select('*')
    .limit(1);
    
  if (scalesError) {
    console.error('❌ Таблица assessment_scales не найдена:', scalesError.message);
  } else {
    console.log('✅ Таблица assessment_scales существует');
    console.log('   Данные:', scales);
  }
  
  // Проверяем наличие колонки test_type в tests
  console.log('\n3. Проверяем колонку test_type...');
  const { data: testWithType, error: typeError } = await supabase
    .from('tests')
    .select('id, test_type')
    .limit(1);
    
  if (typeError) {
    console.error('❌ Колонка test_type недоступна:', typeError);
  } else {
    console.log('✅ Колонка test_type доступна');
    console.log('   Значение:', testWithType[0]?.test_type || 'null');
  }
}

testDatabase();