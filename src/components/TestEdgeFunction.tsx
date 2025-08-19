import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, XCircle, Zap } from 'lucide-react';

const TestEdgeFunction = () => {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testFunction = async () => {
    setTesting(true);
    setResult(null);
    setError(null);

    try {
      console.log('🧪 Тестируем Edge функцию...');

      // Тестовые данные
      const testData = {
        testResultId: 'test-result-123',
        userId: 'test-user-456',
        testId: 'test-789',
        aiGoal: 'Проанализировать цифровые навыки пользователя и дать практические рекомендации по их улучшению',
        userAnswers: [
          { 
            question: 'Работа с компьютером', 
            answer: 'Хорошо владею', 
            points: 3,
            selected_text: 'Хорошо владею'
          },
          { 
            question: 'Создание документов', 
            answer: 'Средне владею', 
            points: 2,
            selected_text: 'Средне владею'
          }
        ],
        testData: {
          title: 'Тест цифровых компетенций',
          description: 'Оценка базовых навыков работы с компьютером',
          questions: [
            { question_text: 'Работа с компьютером', points: 4 },
            { question_text: 'Создание документов', points: 4 }
          ]
        },
        userProfile: {
          full_name: 'Тестовый Пользователь'
        }
      };

      console.log('📤 Отправляем запрос с данными:', testData);

      const { data, error } = await supabase.functions.invoke('generate-ai-recommendations', {
        body: testData
      });

      console.log('📥 Получен ответ:', { data, error });

      if (error) {
        throw new Error(`Edge Function Error: ${JSON.stringify(error)}`);
      }

      setResult(data);
      
    } catch (err: any) {
      console.error('❌ Ошибка тестирования:', err);
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-primary" />
          <span>Тестирование Edge функции</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testFunction} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Тестирование...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Протестировать ИИ рекомендации
            </>
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Ошибка:</strong> {error}
              <br />
              <br />
              <strong>Возможные решения:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Проверьте, развернута ли Edge функция: <code>supabase functions deploy generate-ai-recommendations</code></li>
                <li>Убедитесь, что GEMINI_API_KEY настроен в Edge Function Secrets</li>
                <li>Проверьте логи функции в Supabase Dashboard</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Успех!</strong> Edge функция работает корректно.
              <br />
              <Badge variant="secondary" className="mt-2">
                {result.success ? 'Рекомендации сгенерированы' : 'Ошибка генерации'}
              </Badge>
              {result.recommendations && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-medium">Показать рекомендации</summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-sm whitespace-pre-wrap">
                    {result.recommendations.substring(0, 500)}...
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground">
          <p><strong>Что тестируется:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Доступность Edge функции</li>
            <li>Подключение к Gemini API</li>
            <li>Генерация ИИ рекомендаций</li>
            <li>Сохранение в базу данных</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default TestEdgeFunction;