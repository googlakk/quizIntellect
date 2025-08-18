import { test, expect } from '@playwright/test';

test.describe('Assessment Test Check', () => {
  test('should check assessment test functionality', async ({ page }) => {
    console.log('🧪 Проверяем функционал оценочного теста...');
    
    // Переходим к конкретному тесту
    const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
    await page.goto(`http://localhost:8082/test/${testId}`);
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Страница теста загружена');
    
    // Делаем скриншот для анализа
    await page.screenshot({ 
      path: 'assessment-test-page.png',
      fullPage: true 
    });
    console.log('📸 Скриншот сохранен: assessment-test-page.png');
    
    // Проверяем заголовок страницы
    const pageTitle = await page.title();
    console.log(`📝 Заголовок страницы: ${pageTitle}`);
    
    // Ищем заголовок теста
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log(`📋 Найдено H1 элементов: ${h1Count}`);
    
    if (h1Count > 0) {
      const firstH1 = await h1Elements.first().textContent();
      console.log(`   Первый H1: ${firstH1}`);
    }
    
    // Ищем элементы теста
    const testElements = page.locator('text="Тест"');
    const testElementsCount = await testElements.count();
    console.log(`🧪 Элементов с "Тест": ${testElementsCount}`);
    
    // Ищем карточки или контейнеры с контентом
    const cards = page.locator('.card, [class*="card"]');
    const cardsCount = await cards.count();
    console.log(`📋 Найдено карточек: ${cardsCount}`);
    
    // Ищем input элементы
    const inputs = page.locator('input');
    const inputCount = await inputs.count();
    console.log(`🔘 Найдено input элементов: ${inputCount}`);
    
    // Ищем radio buttons
    const radioButtons = page.locator('input[type="radio"]');
    const radioCount = await radioButtons.count();
    console.log(`🔘 Найдено radio buttons: ${radioCount}`);
    
    // Ищем элементы с текстом "владею"
    const ownershipElements = page.locator(':has-text("владею")');
    const ownershipCount = await ownershipElements.count();
    console.log(`📊 Элементов с "владею": ${ownershipCount}`);
    
    // Ищем элементы с текстом "балл"
    const pointElements = page.locator(':has-text("балл")');
    const pointCount = await pointElements.count();
    console.log(`💯 Элементов с "балл": ${pointCount}`);
    
    // Ищем элементы с текстом "оценочный"
    const assessmentElements = page.locator(':has-text("оценочный"), :has-text("Оценочный")');
    const assessmentCount = await assessmentElements.count();
    console.log(`🎯 Элементов с "оценочный": ${assessmentCount}`);
    
    // Проверяем кнопки навигации
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    console.log(`🔘 Найдено кнопок: ${buttonCount}`);
    
    // Получаем текст всех кнопок для анализа
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const buttonText = await buttons.nth(i).textContent();
      console.log(`   Кнопка ${i + 1}: ${buttonText?.trim()}`);
    }
    
    // Проверяем URL страницы
    const currentUrl = page.url();
    console.log(`🔗 Текущий URL: ${currentUrl}`);
    
    // Ищем любые ошибки на странице
    const errorElements = page.locator(':has-text("ошибка"), :has-text("Ошибка"), :has-text("Error")');
    const errorCount = await errorElements.count();
    
    if (errorCount > 0) {
      console.log(`❌ Найдено ошибок: ${errorCount}`);
      for (let i = 0; i < errorCount; i++) {
        const errorText = await errorElements.nth(i).textContent();
        console.log(`   Ошибка ${i + 1}: ${errorText?.trim()}`);
      }
    } else {
      console.log('✅ Ошибок не найдено');
    }
    
    // Получаем HTML контент для анализа
    const bodyContent = await page.locator('body').innerHTML();
    const hasAssessmentScale = bodyContent.includes('владею') && bodyContent.includes('балл');
    const hasQuestionInterface = bodyContent.includes('вопрос') || bodyContent.includes('Вопрос');
    
    console.log(`📊 Шкала оценок присутствует: ${hasAssessmentScale}`);
    console.log(`❓ Интерфейс вопросов присутствует: ${hasQuestionInterface}`);
    
    // Если это оценочный тест, проверяем специфические элементы
    if (hasAssessmentScale) {
      console.log('🎯 НАЙДЕН ОЦЕНОЧНЫЙ ТЕСТ!');
      
      // Пытаемся взаимодействовать с интерфейсом
      if (radioCount > 0) {
        console.log('🔘 Пытаемся выбрать первый вариант...');
        try {
          await radioButtons.first().click();
          console.log('✅ Успешно выбран первый вариант');
        } catch (error) {
          console.log('❌ Не удалось выбрать вариант:', error.message);
        }
      }
    }
    
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
    console.log(`   ✓ Страница загружена: ДА`);
    console.log(`   ✓ Оценочный тест: ${hasAssessmentScale ? 'ДА' : 'НЕТ'}`);
    console.log(`   ✓ Интерфейс вопросов: ${hasQuestionInterface ? 'ДА' : 'НЕТ'}`);
    console.log(`   ✓ Radio buttons: ${radioCount > 0 ? 'ДА' : 'НЕТ'} (${radioCount})`);
    console.log(`   ✓ Ошибки: ${errorCount > 0 ? 'ЕСТЬ' : 'НЕТ'} (${errorCount})`);
  });
});