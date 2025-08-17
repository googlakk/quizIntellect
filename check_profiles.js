import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function checkProfiles() {
  console.log('🔍 Проверяем структуру таблицы profiles...\n');

  try {
    // Попробуем получить все профили с полем category
    const { data: profilesWithCategory, error: categoryError } = await supabase
      .from('profiles')
      .select('id, full_name, category, login_username')
      .limit(5);
    
    if (categoryError) {
      console.log('❌ Ошибка при получении профилей с полем category:', categoryError.message);
      
      // Попробуем с полем subject
      const { data: profilesWithSubject, error: subjectError } = await supabase
        .from('profiles')
        .select('id, full_name, subject, login_username')
        .limit(5);
      
      if (subjectError) {
        console.log('❌ Ошибка при получении профилей с полем subject:', subjectError.message);
        console.log('\n📋 ТРЕБУЕТСЯ МИГРАЦИЯ БАЗЫ ДАННЫХ!');
        console.log('Выполните SQL скрипт migrate_subjects_to_categories.sql в Supabase Dashboard');
      } else {
        console.log('⚠️  Найдено поле "subject" вместо "category"');
        console.log('   Профили с полем subject:');
        profilesWithSubject?.forEach(profile => {
          console.log(`   - ${profile.full_name}: ${profile.subject || 'не указан'}`);
        });
        console.log('\n📋 ТРЕБУЕТСЯ МИГРАЦИЯ!');
        console.log('Выполните SQL скрипт migrate_subjects_to_categories.sql в Supabase Dashboard');
      }
    } else {
      console.log('✅ Поле "category" найдено в таблице profiles');
      console.log('   Профили с полем category:');
      profilesWithCategory?.forEach(profile => {
        console.log(`   - ${profile.full_name}: ${profile.category || 'не указан'}`);
      });
    }

    // Также проверим, есть ли функция для создания профиля
    console.log('\n🔍 Проверяем функции и триггеры...');
    
    const { data: functions, error: functionsError } = await supabase
      .rpc('get_function_list')
      .select();
    
    if (functionsError) {
      console.log('⚠️  Не удалось проверить функции базы данных');
    }

  } catch (error) {
    console.log('❌ Критическая ошибка:', error.message);
  }
}

checkProfiles().catch(console.error);