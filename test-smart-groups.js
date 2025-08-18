import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = "https://xumczqtfbqazkhqrtmxf.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bWN6cXRmYnFhemtocXJ0bXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTUxMjMsImV4cCI6MjA3MDk5MTEyM30.JEiLalLryC7njKJSxKam9BXXrcmk4O5ZEAGKVMJAu2Q";

const supabase = createClient(supabaseUrl, supabaseKey);

async function createCompetencyTests() {
  console.log('🧠 Создаем тесты для системы умных групп...');
  
  const competencyTests = [
    {
      title: "Цифровые навыки преподавателя",
      description: "Оцените свой уровень владения цифровыми технологиями в образовании",
      category: "Цифровая грамотность",
      test_type: "assessment",
      time_limit_minutes: 10,
      assessment_scales: [
        { label: "Начинающий (требуется обучение)", points: 1, order_index: 0 },
        { label: "Базовый уровень", points: 2, order_index: 1 },
        { label: "Уверенный пользователь", points: 3, order_index: 2 },
        { label: "Эксперт", points: 4, order_index: 3 }
      ],
      questions: [
        { question_text: "Создание и редактирование презентаций (PowerPoint, Google Slides)", question_type: "single_choice", points: 4 },
        { question_text: "Работа с электронными таблицами для анализа данных", question_type: "single_choice", points: 4 },
        { question_text: "Использование облачных сервисов для совместной работы", question_type: "single_choice", points: 4 },
        { question_text: "Создание интерактивного контента (викторины, опросы)", question_type: "single_choice", points: 4 },
        { question_text: "Работа с системами видеоконференций", question_type: "single_choice", points: 4 }
      ]
    },
    {
      title: "Педагогические методы и подходы",
      description: "Оцените свои навыки в области современных методов обучения",
      category: "Педагогика",
      test_type: "assessment",
      time_limit_minutes: 10,
      assessment_scales: [
        { label: "Традиционные методы", points: 1, order_index: 0 },
        { label: "Смешанные подходы", points: 2, order_index: 1 },
        { label: "Инновационные методы", points: 3, order_index: 2 },
        { label: "Передовой опыт", points: 4, order_index: 3 }
      ],
      questions: [
        { question_text: "Применение активных методов обучения", question_type: "single_choice", points: 4 },
        { question_text: "Организация проектной деятельности студентов", question_type: "single_choice", points: 4 },
        { question_text: "Использование игровых технологий в обучении", question_type: "single_choice", points: 4 },
        { question_text: "Индивидуализация образовательного процесса", question_type: "single_choice", points: 4 },
        { question_text: "Развитие критического мышления у студентов", question_type: "single_choice", points: 4 }
      ]
    },
    {
      title: "Оценка и контроль знаний",
      description: "Оцените свои навыки в области оценивания образовательных результатов",
      category: "Оценка и контроль",
      test_type: "assessment",
      time_limit_minutes: 8,
      assessment_scales: [
        { label: "Стандартные методы", points: 1, order_index: 0 },
        { label: "Разнообразные подходы", points: 2, order_index: 1 },
        { label: "Современные технологии", points: 3, order_index: 2 },
        { label: "Инновационная оценка", points: 4, order_index: 3 }
      ],
      questions: [
        { question_text: "Создание и использование рубрик оценивания", question_type: "single_choice", points: 4 },
        { question_text: "Организация формативного оценивания", question_type: "single_choice", points: 4 },
        { question_text: "Использование цифровых инструментов для тестирования", question_type: "single_choice", points: 4 },
        { question_text: "Анализ и интерпретация результатов обучения", question_type: "single_choice", points: 4 }
      ]
    },
    {
      title: "Коммуникативные навыки",
      description: "Оцените свои коммуникативные способности в образовательном процессе",
      category: "Коммуникация",
      test_type: "assessment",
      time_limit_minutes: 8,
      assessment_scales: [
        { label: "Базовая коммуникация", points: 1, order_index: 0 },
        { label: "Эффективное общение", points: 2, order_index: 1 },
        { label: "Мастерство общения", points: 3, order_index: 2 },
        { label: "Коммуникативный лидер", points: 4, order_index: 3 }
      ],
      questions: [
        { question_text: "Проведение публичных выступлений и презентаций", question_type: "single_choice", points: 4 },
        { question_text: "Ведение дискуссий и групповых обсуждений", question_type: "single_choice", points: 4 },
        { question_text: "Работа с конфликтными ситуациями", question_type: "single_choice", points: 4 },
        { question_text: "Обратная связь и мотивация студентов", question_type: "single_choice", points: 4 }
      ]
    }
  ];

  for (const testData of competencyTests) {
    try {
      console.log(`\n📝 Создаем тест: ${testData.title}`);
      
      // 1. Создать/найти категорию
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
          .insert({ name: testData.category, description: `Автоматически созданная для теста "${testData.title}"` })
          .select('id')
          .single();
        
        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
        console.log('✅ Категория создана');
      }
      
      // 2. Создать тест
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
      console.log('✅ Тест создан');
      
      // 3. Создать шкалу оценок
      const scalesData = testData.assessment_scales.map(scale => ({
        test_id: test.id,
        label: scale.label,
        points: scale.points,
        order_index: scale.order_index
      }));
      
      const { error: scalesError } = await supabase
        .from('assessment_scales')
        .insert(scalesData);
      
      if (scalesError) throw scalesError;
      console.log('✅ Шкала оценок создана');
      
      // 4. Создать вопросы
      const questionPoints = Math.max(...testData.assessment_scales.map(s => s.points));
      
      for (let i = 0; i < testData.questions.length; i++) {
        const questionData = testData.questions[i];
        
        const { error: questionError } = await supabase
          .from('questions')
          .insert({
            test_id: test.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            points: questionPoints,
            order_index: i
          });
        
        if (questionError) throw questionError;
      }
      
      console.log(`✅ ${testData.questions.length} вопросов создано`);
      console.log(`🔗 ID теста: ${test.id}`);
      
    } catch (error) {
      console.error(`❌ Ошибка при создании теста "${testData.title}":`, error);
    }
  }
  
  console.log('\n🎉 Все тесты для умных групп созданы!');
  console.log('Теперь можно:');
  console.log('1. Пройти несколько тестов разными пользователями');
  console.log('2. Перейти в админ панель → Умные группы');
  console.log('3. Настроить параметры и создать сбалансированные группы');
}

createCompetencyTests();