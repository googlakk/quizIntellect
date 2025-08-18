import { test, expect } from '@playwright/test';

test.describe('Simple Assessment Test Check', () => {
  test('should access application and check test interface', async ({ page }) => {
    console.log('🧪 Простая проверка интерфейса оценочного теста...');
    
    // Переходим на главную страницу
    await page.goto('http://localhost:8082');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Приложение загружено');
    
    // Проверяем доступность тестов
    await page.goto('http://localhost:8082/tests');
    await page.waitForLoadState('networkidle');
    
    // Ищем любые тесты
    const testCards = page.locator('.card');
    const testCount = await testCards.count();
    console.log(`📋 Найдено тестов: ${testCount}`);
    
    if (testCount > 0) {
      // Кликаем на первый тест
      const firstTestLink = page.locator('a[href*="/test/"]').first();
      if (await firstTestLink.isVisible()) {
        const testUrl = await firstTestLink.getAttribute('href');
        console.log(`🔗 Переходим к тесту: ${testUrl}`);
        
        await firstTestLink.click();
        await page.waitForLoadState('networkidle');
        
        // Проверяем, загрузилась ли страница теста
        const pageTitle = await page.title();
        console.log(`📝 Страница: ${pageTitle}`);
        
        // Ищем элементы интерфейса теста
        const questionText = page.locator('h2, h3, .text-lg');
        if (await questionText.first().isVisible()) {
          const firstQuestion = await questionText.first().textContent();
          console.log(`❓ Первый вопрос: ${firstQuestion?.substring(0, 50)}...`);
        }
        
        // Проверяем наличие вариантов ответов или шкалы оценок
        const radioButtons = page.locator('input[type="radio"]');
        const radioCount = await radioButtons.count();
        console.log(`🔘 Найдено radio buttons: ${radioCount}`);
        
        // Ищем элементы шкалы оценок
        const assessmentLabels = page.locator('text*="владею"');
        const assessmentCount = await assessmentLabels.count();
        console.log(`📊 Найдено элементов шкалы: ${assessmentCount}`);
        
        // Ищем информацию об оценочном тесте
        const assessmentInfo = page.locator('text*="Оценочный"');
        if (await assessmentInfo.isVisible()) {
          console.log('🎯 Найден оценочный тест!');
          
          // Проверяем наличие специфических элементов
          const selfEvalText = page.locator('text*="самооценка"');
          if (await selfEvalText.isVisible()) {
            console.log('✅ Найден текст о самооценке');
          }
          
          // Ищем элементы шкалы
          const scaleElements = [
            'text*="Плохо владею"',
            'text*="Базовые навыки"', 
            'text*="Хорошо владею"',
            'text*="Отлично владею"'
          ];
          
          for (const selector of scaleElements) {
            const element = page.locator(selector);
            if (await element.isVisible()) {
              console.log(`✅ Найден элемент шкалы: ${selector}`);
            }
          }
          
          // Проверяем баллы
          const pointsElements = page.locator('text*="балл"');
          const pointsCount = await pointsElements.count();
          console.log(`💯 Найдено элементов с баллами: ${pointsCount}`);
          
        } else {
          console.log('📝 Обычный тест');
          
          // Для обычного теста проверяем стандартные элементы
          if (radioCount > 0) {
            console.log('✅ Найдены варианты ответов');
          }
        }
        
        // Делаем скриншот для визуальной проверки
        await page.screenshot({ 
          path: 'test-interface-screenshot.png',
          fullPage: true 
        });
        console.log('📸 Скриншот сохранен: test-interface-screenshot.png');
        
      } else {
        console.log('❌ Ссылки на тесты не найдены');
      }
    } else {
      console.log('❌ Тесты не найдены');
    }
  });

  test('should check specific assessment test', async ({ page }) => {
    console.log('🧪 Проверяем конкретный оценочный тест...');
    
    const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
    await page.goto(`http://localhost:8082/test/${testId}`);
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что страница загрузилась без ошибок
    const errorMessages = page.locator('text*="ошибка"');
    const errorCount = await errorMessages.count();
    
    if (errorCount > 0) {
      console.log('❌ Найдены ошибки на странице');
      const errorText = await errorMessages.first().textContent();
      console.log(`   Ошибка: ${errorText}`);
    } else {
      console.log('✅ Страница загружена без ошибок');
    }
    
    // Ищем заголовок теста
    const testTitle = page.locator('h1, h2').first();
    if (await testTitle.isVisible()) {
      const title = await testTitle.textContent();
      console.log(`📝 Заголовок: ${title}`);
    }
    
    // Проверяем тип теста
    const assessmentBadge = page.locator('text*="Оценочный тест"');
    if (await assessmentBadge.isVisible()) {
      console.log('🎯 Подтверждено: это оценочный тест');
      
      // Ищем элементы шкалы оценок  
      const scaleItems = page.locator('[role="radiogroup"] > div');
      const scaleCount = await scaleItems.count();
      console.log(`📊 Найдено элементов шкалы: ${scaleCount}`);
      
      // Проверяем каждый элемент шкалы
      for (let i = 0; i < Math.min(scaleCount, 4); i++) {
        const scaleItem = scaleItems.nth(i);
        const text = await scaleItem.textContent();
        console.log(`   ${i + 1}. ${text?.trim()}`);
      }
      
    } else {
      console.log('📝 Обычный тест или тест еще не обновлен');
    }
    
    // Делаем скриншот конкретного теста
    await page.screenshot({ 
      path: 'specific-test-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Скриншот конкретного теста: specific-test-screenshot.png');
  });
});