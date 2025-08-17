// Простой скрипт для миграции ролей в Supabase
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Загружаем переменные окружения из .env.local если он существует
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL не найден в переменных окружения');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_KEY или VITE_SUPABASE_ANON_KEY не найден в переменных окружения');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addRoleColumn() {
  console.log('🔄 Начинаем миграцию ролей...');

  try {
    // Получаем список всех профилей для проверки
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, full_name, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Ошибка при получении профилей:', fetchError);
      return;
    }

    console.log(`📊 Найдено ${profiles.length} профилей`);

    if (profiles.length === 0) {
      console.log('ℹ️  Профили не найдены, миграция не требуется');
      return;
    }

    // Попробуем обновить первого пользователя как админа
    const firstUser = profiles[0];
    const { error: adminError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('user_id', firstUser.user_id);

    if (adminError) {
      console.error('❌ Ошибка при назначении админа:', adminError);
      console.log('ℹ️  Возможно, колонка role еще не существует. Выполните SQL скрипт в Supabase Dashboard.');
      return;
    }

    console.log(`✅ Пользователь "${firstUser.full_name}" назначен администратором`);

    // Обновляем остальных пользователей как студентов
    const otherUsers = profiles.slice(1);
    for (const user of otherUsers) {
      const { error: studentError } = await supabase
        .from('profiles')
        .update({ role: 'student' })
        .eq('user_id', user.user_id);

      if (studentError) {
        console.error(`❌ Ошибка при назначении роли студента для ${user.full_name}:`, studentError);
      } else {
        console.log(`✅ Пользователь "${user.full_name}" назначен студентом`);
      }
    }

    console.log('🎉 Миграция ролей завершена успешно!');

  } catch (error) {
    console.error('💥 Критическая ошибка:', error);
  }
}

addRoleColumn();