// Supabase Edge Function для генерации ИИ рекомендаций с помощью Gemini API
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  testResultId: string;
  userId: string;
  testId: string;
  aiGoal: string;
  userAnswers: any[];
  testData: {
    title: string;
    description?: string;
    questions: any[];
  };
  userProfile: {
    full_name: string;
  };
}

serve(async (req) => {
  // Обработка CORS preflight запросов
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Создаем клиент Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем данные из запроса
    const requestBody: RequestBody = await req.json()
    const { testResultId, userId, testId, aiGoal, userAnswers, testData, userProfile } = requestBody

    // Проверяем наличие API ключа Gemini
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY не настроен')
    }

    // Подготавливаем данные для анализа
    const analysisData = {
      testTitle: testData.title,
      testDescription: testData.description,
      userName: userProfile.full_name,
      goal: aiGoal,
      answers: userAnswers.map((answer, index) => ({
        question: testData.questions[index]?.question_text || `Вопрос ${index + 1}`,
        answer: answer.selected_text || answer.answer_text || 'Нет ответа',
        points: answer.points_earned || 0
      }))
    }

    // Создаем промпт для Gemini
    const prompt = `
Вы - опытный педагогический консультант. Проанализируйте результаты теста и дайте персональные рекомендации.

ЦЕЛЬ АНАЛИЗА:
${aiGoal}

ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:
Имя: ${analysisData.userName}
Тест: ${analysisData.testTitle}
${analysisData.testDescription ? `Описание: ${analysisData.testDescription}` : ''}

ОТВЕТЫ ПОЛЬЗОВАТЕЛЯ:
${analysisData.answers.map((item, i) => `
${i + 1}. ${item.question}
Ответ: ${item.answer}
Баллы: ${item.points}
`).join('')}

ЗАДАЧА:
Основываясь на цели анализа и ответах пользователя, предоставьте:
1. Краткий анализ текущих компетенций
2. Выявленные сильные стороны
3. Области для развития
4. Конкретные практические рекомендации
5. Ресурсы для обучения (если применимо)

Ответ должен быть:
- Персонализированным и конструктивным
- На русском языке
- Структурированным с использованием markdown
- Практичным и применимым
- Мотивирующим и поддерживающим

Формат ответа в markdown:
# Персональные рекомендации для ${analysisData.userName}

## 📊 Анализ результатов
[Ваш анализ здесь]

## 💪 Ваши сильные стороны
[Выявленные сильные стороны]

## 🎯 Области для развития
[Что можно улучшить]

## 🚀 Практические рекомендации
[Конкретные шаги для развития]

## 📚 Полезные ресурсы
[Рекомендованные материалы и ресурсы]
`

    // Отправляем запрос к Gemini API
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    })

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`)
    }

    const geminiData = await geminiResponse.json()
    
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('Нет ответа от Gemini API')
    }

    const recommendations = geminiData.candidates[0].content.parts[0].text

    // Сохраняем рекомендации в базу данных
    const { error: insertError } = await supabase
      .from('ai_recommendations')
      .insert({
        test_result_id: testResultId,
        user_id: userId,
        test_id: testId,
        ai_goal: aiGoal,
        user_answers: analysisData.answers,
        recommendations: recommendations
      })

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations: recommendations 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error generating AI recommendations:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-ai-recommendations' \
    --header 'Authorization: Bearer YOUR_ANON_KEY' \
    --header 'Content-Type: application/json' \
    --data '{"testResultId":"...","userId":"...","testId":"...","aiGoal":"...","userAnswers":[],"testData":{},"userProfile":{}}'

*/