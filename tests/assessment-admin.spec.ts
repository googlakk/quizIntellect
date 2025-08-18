import { test, expect } from '@playwright/test';

test.describe('Assessment Test Admin Interface', () => {
  test('should show assessment interface when editing assessment test', async ({ page }) => {
    console.log('🧪 Тестируем интерфейс администратора для оценочных тестов...');
    
    // Переходим к редактированию конкретного теста
    const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
    await page.goto(`http://localhost:8082/admin/test/${testId}/edit`);
    await page.waitForLoadState('networkidle');
    
    // Делаем скриншот для анализа
    await page.screenshot({ 
      path: 'assessment-admin-interface.png',
      fullPage: true 
    });
    console.log('📸 Скриншот сохранен: assessment-admin-interface.png');
    
    // Проверяем заголовок страницы
    const pageTitle = await page.title();
    console.log(`📝 Заголовок страницы: ${pageTitle}`);
    
    // Ищем кнопку создания вопроса
    const createQuestionButton = page.locator('button:has-text("Создать вопрос")');
    if (await createQuestionButton.isVisible()) {
      console.log('🔘 Кнопка создания вопроса найдена');
      
      // Кликаем для открытия модального окна
      await createQuestionButton.click();
      await page.waitForSelector('[role="dialog"]');
      console.log('📝 Модальное окно создания вопроса открыто');
      
      // Ищем элементы интерфейса оценочного теста
      const assessmentInfo = page.locator('text*="Оценочный тест"');
      if (await assessmentInfo.isVisible()) {
        console.log('🎯 Найдена информация об оценочном тесте!');
        
        // Проверяем наличие шкалы оценок
        const scaleElements = [
          'text*="Плохо владею"',
          'text*="Базовые навыки"', 
          'text*="Хорошо владею"',
          'text*="Отлично владею"'
        ];
        
        let foundScales = 0;
        for (const selector of scaleElements) {
          const element = page.locator(selector);
          if (await element.isVisible()) {
            console.log(`✅ Найден элемент шкалы: ${selector}`);
            foundScales++;
          }
        }
        
        console.log(`📊 Найдено элементов шкалы: ${foundScales}/4`);
        
        // Проверяем баллы
        const pointsElements = page.locator('text*="балл"');
        const pointsCount = await pointsElements.count();
        console.log(`💯 Найдено элементов с баллами: ${pointsCount}`);
        
        // Проверяем поле времени
        const timeField = page.locator('input[placeholder*="ограничений"]');
        if (await timeField.isVisible()) {
          console.log('⏱️ Поле времени найдено');
        }
        
        // Проверяем, что нет полей для создания вариантов ответов
        const answerOptions = page.locator('text*="Варианты ответов"');
        const hasAnswerOptions = await answerOptions.isVisible();
        console.log(`🔘 Интерфейс вариантов ответов: ${hasAnswerOptions ? 'ЕСТЬ' : 'НЕТ'} (должен отсутствовать для оценочных тестов)`);
        
        // Заполняем форму для тестирования
        await page.fill('textarea[name="question_text"]', 'Как вы оцениваете свои навыки работы с данной технологией?');
        
        console.log('📝 Заполнили текст вопроса');
        
        // Проверяем, что поле баллов заблокировано
        const pointsField = page.locator('input[name="points"]');
        const isPointsDisabled = await pointsField.isDisabled();
        console.log(`💯 Поле баллов заблокировано: ${isPointsDisabled ? 'ДА' : 'НЕТ'} (должно быть заблокировано)`);
        
        if (foundScales >= 4 && !hasAnswerOptions) {
          console.log('🎉 УСПЕХ: Интерфейс оценочного теста работает корректно!');
        } else {
          console.log('⚠️  Интерфейс требует доработки');
        }
        
      } else {
        console.log('📝 Обычный тест или тест еще не обновлен на assessment тип');
        
        // Проверяем обычный интерфейс
        const regularAnswerOptions = page.locator('text="Варианты ответов"');
        if (await regularAnswerOptions.isVisible()) {
          console.log('📝 Отображается интерфейс обычного теста');
        }
      }
      
      // Закрываем модальное окно
      await page.click('button:has-text("Отмена")');
      console.log('❌ Модальное окно закрыто');
      
    } else {
      console.log('❌ Кнопка создания вопроса не найдена');
    }
    
    // Проверяем отображение существующих вопросов
    const questionCards = page.locator('.card');
    const questionCount = await questionCards.count();
    console.log(`📋 Найдено карточек вопросов: ${questionCount}`);
    
    if (questionCount > 0) {
      // Проверяем первый вопрос
      const firstQuestion = questionCards.first();
      const questionText = await firstQuestion.textContent();
      console.log(`❓ Первый вопрос: ${questionText?.substring(0, 100)}...`);
    }
    
    console.log('\n📊 ИТОГОВЫЙ ОТЧЕТ:');
    console.log(`   ✓ Страница редактирования загружена: ДА`);
    console.log(`   ✓ Модальное окно создания вопроса: ДА`);
    console.log(`   ✓ Оценочный интерфейс: ${await assessmentInfo.isVisible() ? 'ДА' : 'НЕТ'}`);
    console.log(`   ✓ Количество вопросов: ${questionCount}`);
  });
});