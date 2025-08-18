import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🔄 Выполняем миграцию базы данных...');
    
    // Добавляем test_type колонку
    console.log('1. Добавляем test_type колонку...');
    const { error: alterError } = await supabase.rpc('sql', { 
      query: `ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_type VARCHAR(20) DEFAULT 'quiz' CHECK (test_type IN ('quiz', 'assessment'));`
    });
    
    if (alterError && !alterError.message.includes('already exists')) {
      console.error('Ошибка при добавлении test_type:', alterError);
      return;
    }
    console.log('✅ test_type колонка добавлена');
    
    // Создаем таблицу assessment_scales
    console.log('2. Создаем таблицу assessment_scales...');
    const { error: createError } = await supabase.rpc('sql', { 
      query: `
        CREATE TABLE IF NOT EXISTS assessment_scales (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
          label VARCHAR(255) NOT NULL,
          points INTEGER NOT NULL,
          order_index INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (createError) {
      console.error('Ошибка при создании assessment_scales:', createError);
      return;
    }
    console.log('✅ Таблица assessment_scales создана');
    
    // Создаем индексы
    console.log('3. Создаем индексы...');
    await supabase.rpc('sql', { 
      query: `CREATE INDEX IF NOT EXISTS idx_assessment_scales_test_id ON assessment_scales(test_id);`
    });
    await supabase.rpc('sql', { 
      query: `CREATE INDEX IF NOT EXISTS idx_assessment_scales_order ON assessment_scales(test_id, order_index);`
    });
    console.log('✅ Индексы созданы');
    
    console.log('🎉 Миграция завершена успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка выполнения миграции:', error);
  }
}

runMigration();