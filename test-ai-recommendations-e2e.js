// End-to-End тест для проверки ИИ рекомендаций с Playwright
const { test, expect } = require('@playwright/test');

test.describe('ИИ Рекомендации - Диагностика', () => {
  let page;
  let logs = [];
  let errors = [];

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Перехватываем все логи консоли
    page.on('console', (message) => {
      const log = {
        type: message.type(),
        text: message.text(),
        timestamp: new Date().toISOString()
      };
      logs.push(log);
      console.log(`[${log.type.toUpperCase()}] ${log.text}`);
    });

    // Перехватываем ошибки
    page.on('pageerror', (error) => {
      const errorInfo = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
      errors.push(errorInfo);
      console.error('❌ PAGE ERROR:', error.message);
    });

    // Перехватываем сетевые запросы
    page.on('response', async (response) => {
      if (response.url().includes('functions/v1/generate-ai-recommendations')) {
        const responseInfo = {
          url: response.url(),
          status: response.status(),
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        };
        
        console.log('🌐 EDGE FUNCTION RESPONSE:', responseInfo);
        
        try {
          const body = await response.text();
          console.log('📄 RESPONSE BODY:', body);
        } catch (e) {
          console.log('⚠️ Could not read response body');
        }
      }
    });

    // Перехватываем неудачные сетевые запросы
    page.on('requestfailed', (request) => {
      if (request.url().includes('functions/v1/generate-ai-recommendations')) {
        console.error('❌ NETWORK REQUEST FAILED:', {
          url: request.url(),
          method: request.method(),
          failure: request.failure()
        });
      }
    });
  });

  test('Проверка доступности приложения', async () => {
    console.log('🚀 Запускаем тест доступности приложения...');
    
    await page.goto('http://localhost:8084');
    
    // Ждем загрузки страницы
    await expect(page.locator('text=QuizIntellect')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Приложение доступно');
  });

  test('Тестирование Edge функции через админ панель', async () => {
    console.log('🔧 Тестируем Edge функцию через админ панель...');
    
    try {
      // Переходим на страницу приложения
      await page.goto('http://localhost:8084');
      
      // Ждем загрузки
      await page.waitForTimeout(2000);
      
      // Ищем админскую панель или форму входа
      const hasAdminButton = await page.locator('text=Админ').isVisible();
      
      if (hasAdminButton) {
        console.log('🔑 Переходим в админ панель...');
        await page.click('text=Админ');
        
        // Ищем вкладку "Тест ИИ"
        const hasTestTab = await page.locator('text=Тест ИИ').isVisible();
        
        if (hasTestTab) {
          console.log('🧪 Открываем вкладку тестирования ИИ...');
          await page.click('text=Тест ИИ');
          
          // Ищем кнопку тестирования
          const testButton = page.locator('button:has-text("Протестировать ИИ рекомендации")');
          
          if (await testButton.isVisible()) {
            console.log('🎯 Нажимаем кнопку тестирования...');
            
            // Очищаем логи перед тестом
            logs = [];
            errors = [];
            
            await testButton.click();
            
            // Ждем выполнения запроса
            await page.waitForTimeout(10000);
            
            // Анализируем результаты
            console.log('\n📊 АНАЛИЗ РЕЗУЛЬТАТОВ:');
            console.log('Количество логов:', logs.length);
            console.log('Количество ошибок:', errors.length);
            
            // Ищем специфичные логи
            const aiLogs = logs.filter(log => 
              log.text.includes('Edge функци') || 
              log.text.includes('Gemini') ||
              log.text.includes('рекомендаци')
            );
            
            console.log('ИИ-связанные логи:', aiLogs);
            
            if (errors.length > 0) {
              console.log('\n❌ ОШИБКИ:');
              errors.forEach((error, i) => {
                console.log(`${i + 1}. ${error.message}`);
              });
            }
            
          } else {
            console.log('⚠️ Кнопка тестирования ИИ не найдена');
          }
        } else {
          console.log('⚠️ Вкладка "Тест ИИ" не найдена');
        }
      } else {
        console.log('⚠️ Кнопка "Админ" не найдена - возможно нужна авторизация');
      }
      
    } catch (error) {
      console.error('❌ Ошибка в тесте:', error.message);
    }
  });

  test('Диагностика проблем с Edge функцией', async () => {
    console.log('🔍 Запускаем диагностику Edge функции...');
    
    // Проверяем доступность Supabase
    try {
      await page.goto('http://localhost:8084');
      await page.waitForTimeout(2000);
      
      // Выполняем тест в браузере
      const diagnosticResult = await page.evaluate(async () => {
        const results = {
          supabaseLoaded: false,
          functions: null,
          error: null
        };
        
        try {
          // Проверяем доступность Supabase
          if (window.supabase) {
            results.supabaseLoaded = true;
          }
          
          // Пытаемся вызвать Edge функцию напрямую
          const testData = {
            testResultId: 'test-123',
            userId: 'user-456',
            testId: 'test-789',
            aiGoal: 'Тест',
            userAnswers: [],
            testData: { title: 'Тест', questions: [] },
            userProfile: { full_name: 'Тест' }
          };
          
          if (window.supabase && window.supabase.functions) {
            const response = await window.supabase.functions.invoke('generate-ai-recommendations', {
              body: testData
            });
            
            results.functions = {
              data: response.data,
              error: response.error
            };
          }
          
        } catch (err) {
          results.error = err.message;
        }
        
        return results;
      });
      
      console.log('📊 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:');
      console.log('Supabase загружен:', diagnosticResult.supabaseLoaded);
      console.log('Результат вызова функции:', diagnosticResult.functions);
      console.log('Ошибки:', diagnosticResult.error);
      
      // Предлагаем решения на основе результатов
      if (!diagnosticResult.supabaseLoaded) {
        console.log('\n🔧 РЕШЕНИЕ: Проблема с подключением к Supabase');
        console.log('- Проверьте переменные окружения');
        console.log('- Убедитесь что Supabase проект активен');
      }
      
      if (diagnosticResult.functions?.error) {
        console.log('\n🔧 РЕШЕНИЕ: Проблема с Edge функцией');
        console.log('- Разверните функцию: supabase functions deploy generate-ai-recommendations');
        console.log('- Проверьте GEMINI_API_KEY в Function Secrets');
      }
      
    } catch (error) {
      console.error('❌ Ошибка диагностики:', error.message);
    }
  });

  test.afterEach(async () => {
    // Сохраняем логи в файл для анализа
    const logSummary = {
      timestamp: new Date().toISOString(),
      totalLogs: logs.length,
      totalErrors: errors.length,
      logs: logs,
      errors: errors
    };
    
    // Выводим итоговую информацию
    console.log('\n📋 ИТОГОВЫЙ ОТЧЕТ:');
    console.log('Всего логов:', logs.length);
    console.log('Всего ошибок:', errors.length);
    
    if (errors.length > 0) {
      console.log('\n❌ КРИТИЧЕСКИЕ ОШИБКИ:');
      errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
      });
    }
    
    // Рекомендации по исправлению
    console.log('\n🔧 РЕКОМЕНДАЦИИ:');
    if (errors.some(e => e.message.includes('Edge Function'))) {
      console.log('1. Разверните Edge функцию: supabase functions deploy generate-ai-recommendations');
    }
    if (errors.some(e => e.message.includes('GEMINI_API_KEY'))) {
      console.log('2. Настройте GEMINI_API_KEY в Edge Function Secrets');
    }
    if (logs.some(l => l.text.includes('network') && l.type === 'error')) {
      console.log('3. Проверьте интернет-соединение и статус Supabase');
    }
    
    await page.close();
  });
});