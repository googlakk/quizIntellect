import { createClient } from '@supabase/supabase-js';

// Используем реальные учетные данные Supabase
const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  console.log('🔍 Проверяем состояние базы данных...\n');

  // Проверяем, есть ли таблица subjects
  try {
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .limit(1);
    
    if (!subjectsError) {
      console.log('❌ НАЙДЕНА СТАРАЯ ТАБЛИЦА: subjects');
      console.log('   Необходимо выполнить миграцию базы данных\n');
    }
  } catch (error) {
    console.log('✅ Таблица subjects не найдена (это хорошо)');
  }

  // Проверяем, есть ли таблица categories
  try {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(5);
    
    if (categoriesError) {
      console.log('❌ ТАБЛИЦА categories НЕ НАЙДЕНА');
      console.log('   Ошибка:', categoriesError.message);
      console.log('\n📋 НЕОБХОДИМЫЕ ДЕЙСТВИЯ:');
      console.log('1. Откройте Supabase Dashboard');
      console.log('2. Перейдите в SQL Editor');
      console.log('3. Выполните содержимое файла migrate_subjects_to_categories.sql');
      console.log('4. Перезапустите приложение\n');
    } else {
      console.log('✅ Таблица categories найдена');
      console.log(`   Количество разделов: ${categoriesData?.length || 0}`);
      if (categoriesData && categoriesData.length > 0) {
        console.log('   Разделы:');
        categoriesData.forEach(cat => {
          console.log(`   - ${cat.name}`);
        });
      }
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке таблицы categories:', error.message);
  }

  // Проверяем таблицу tests
  try {
    const { data: testsData, error: testsError } = await supabase
      .from('tests')
      .select('id, title, category_id')
      .limit(1);
    
    if (testsError) {
      console.log('❌ Ошибка при проверке таблицы tests:', testsError.message);
    } else {
      console.log('✅ Таблица tests доступна');
      if (testsData && testsData.length > 0) {
        const firstTest = testsData[0];
        if (firstTest.category_id) {
          console.log('✅ Поле category_id найдено в tests');
        }
      }
    }
  } catch (error) {
    console.log('❌ Ошибка при проверке таблицы tests:', error.message);
  }
}

checkDatabase().catch(console.error);