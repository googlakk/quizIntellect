import { createClient } from '@supabase/supabase-js';

// Вам нужно будет заменить эти значения на ваши реальные
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function migrateRoles() {
  try {
    console.log('Начинаем миграцию ролей...');

    // 1. Добавляем колонку role в таблицу profiles
    const { error: alterError } = await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
        CHECK (role IN ('admin', 'student'));
      `
    });

    if (alterError) {
      console.error('Ошибка при добавлении колонки role:', alterError);
    } else {
      console.log('✅ Колонка role добавлена успешно');
    }

    // 2. Устанавливаем первого пользователя как админа
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, full_name, created_at')
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Ошибка при получении профилей:', fetchError);
      return;
    }

    if (profiles && profiles.length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('user_id', profiles[0].user_id);

      if (updateError) {
        console.error('Ошибка при обновлении роли:', updateError);
      } else {
        console.log(`✅ Пользователь ${profiles[0].full_name} назначен администратором`);
      }
    }

    // 3. Устанавливаем роль 'student' для всех остальных пользователей
    const { error: updateAllError } = await supabase
      .from('profiles')
      .update({ role: 'student' })
      .is('role', null);

    if (updateAllError) {
      console.error('Ошибка при обновлении ролей студентов:', updateAllError);
    } else {
      console.log('✅ Роли студентов обновлены');
    }

    console.log('✅ Миграция ролей завершена успешно!');

  } catch (error) {
    console.error('Критическая ошибка при миграции:', error);
  }
}

// Если файл запускается напрямую
if (require.main === module) {
  migrateRoles();
}

export { migrateRoles };