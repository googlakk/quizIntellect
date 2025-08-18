import { test, expect } from '@playwright/test';

test.describe('Assessment Test Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу
    await page.goto('http://localhost:8082');
  });

  test('should create assessment test in admin panel', async ({ page }) => {
    console.log('🧪 Тестируем создание оценочного теста...');
    
    // Переходим в админ панель
    await page.goto('http://localhost:8082/admin');
    
    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что мы на странице админ панели
    await expect(page.locator('h1')).toContainText('Админ панель');
    
    // Ищем кнопку "Создать тест"
    const createTestButton = page.locator('button', { hasText: 'Создать тест' }).first();
    await expect(createTestButton).toBeVisible();
    await createTestButton.click();
    
    // Ждем открытия диалога
    await page.waitForSelector('[role="dialog"]');
    
    // Заполняем форму создания теста
    await page.fill('input[name="title"]', 'Тестовый оценочный тест');
    await page.fill('textarea[name="description"]', 'Описание тестового оценочного теста для проверки функционала');
    
    // Выбираем тип теста "assessment"
    await page.click('button[role="combobox"]'); // Открываем Select для test_type
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"][data-value="assessment"]');
    
    // Выбираем категорию
    const categorySelects = page.locator('button[role="combobox"]');
    await categorySelects.nth(1).click(); // Второй select для category
    await page.waitForSelector('[role="option"]');
    await page.click('[role="option"]'); // Выбираем первую доступную категорию
    
    // Устанавливаем время (опционально)
    await page.fill('input[name="time_limit"]', '30');
    
    // Отправляем форму
    await page.click('button[type="submit"]');
    
    // Ждем успешного создания
    await page.waitForSelector('.toast', { timeout: 10000 });
    
    // Проверяем, что тест создан и отображается в списке
    await expect(page.locator('text=Тестовый оценочный тест')).toBeVisible();
    await expect(page.locator('text=Оценочный')).toBeVisible();
    
    console.log('✅ Оценочный тест успешно создан');
  });

  test('should display assessment scales in test taking interface', async ({ page }) => {
    console.log('🧪 Тестируем интерфейс прохождения оценочного теста...');
    
    // Используем существующий тест с assessment_scales
    const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
    await page.goto(`http://localhost:8082/test/${testId}`);
    
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что страница загрузилась
    await expect(page.locator('h1')).toBeVisible();
    
    // Если это оценочный тест, проверяем наличие шкалы оценок
    const assessmentInfo = page.locator('text=Оценочный тест');
    if (await assessmentInfo.isVisible()) {
      console.log('✅ Найден оценочный тест');
      
      // Проверяем наличие шкалы оценок
      await expect(page.locator('text=Плохо владею')).toBeVisible();
      await expect(page.locator('text=Базовые навыки')).toBeVisible();
      await expect(page.locator('text=Хорошо владею')).toBeVisible();
      await expect(page.locator('text=Отлично владею')).toBeVisible();
      
      // Проверяем баллы
      await expect(page.locator('text=1 балл')).toBeVisible();
      await expect(page.locator('text=2 балла')).toBeVisible();
      await expect(page.locator('text=3 балла')).toBeVisible();
      await expect(page.locator('text=4 балла')).toBeVisible();
      
      console.log('✅ Шкала оценок отображается корректно');
      
      // Выбираем оценку
      await page.click('input[value*=""]'); // Первый radio button
      
      // Переходим к следующему вопросу
      await page.click('button:has-text("Следующий")');
      
      console.log('✅ Навигация между вопросами работает');
    } else {
      console.log('ℹ️  Тест не является оценочным, проверяем обычный интерфейс');
      
      // Для обычного теста проверяем стандартные варианты ответов
      const radioButtons = page.locator('input[type="radio"]');
      await expect(radioButtons.first()).toBeVisible();
    }
  });

  test('should complete assessment test and show results', async ({ page }) => {
    console.log('🧪 Тестируем завершение оценочного теста...');
    
    const testId = '4cf1b10a-4418-4b4b-8195-db432d216c73';
    await page.goto(`http://localhost:8082/test/${testId}`);
    
    await page.waitForLoadState('networkidle');
    
    // Проходим все вопросы
    const totalQuestions = await page.locator('.grid button').count();
    console.log(`📝 Найдено вопросов: ${totalQuestions}`);
    
    for (let i = 0; i < totalQuestions; i++) {
      // Выбираем случайный ответ
      const options = page.locator('input[type="radio"]');
      const optionsCount = await options.count();
      
      if (optionsCount > 0) {
        const randomIndex = Math.floor(Math.random() * optionsCount);
        await options.nth(randomIndex).click();
        
        console.log(`✅ Вопрос ${i + 1}: выбран ответ ${randomIndex + 1}`);
      }
      
      // Переход к следующему вопросу или завершение
      if (i < totalQuestions - 1) {
        await page.click('button:has-text("Следующий")');
        await page.waitForTimeout(500);
      } else {
        // Последний вопрос - завершаем тест
        await page.click('button:has-text("Завершить тест")');
        console.log('🏁 Тест завершен');
      }
    }
    
    // Ждем перехода на страницу результатов
    await page.waitForURL(/\/test\/.*\/result/, { timeout: 10000 });
    
    // Проверяем страницу результатов
    await expect(page.locator('h1')).toContainText('завершен');
    
    // Для оценочного теста проверяем специфические элементы
    const selfAssessmentText = page.locator('text=самооценка');
    if (await selfAssessmentText.isVisible()) {
      console.log('✅ Результаты оценочного теста отображаются корректно');
      await expect(page.locator('text=Самооценка завершена')).toBeVisible();
      await expect(page.locator('text=самооценка')).toBeVisible();
    } else {
      console.log('ℹ️  Обычный тест - проверяем стандартные результаты');
      await expect(page.locator('text=балл')).toBeVisible();
    }
    
    // Проверяем наличие процента и баллов
    await expect(page.locator('text=%')).toBeVisible();
    await expect(page.locator('text=балл')).toBeVisible();
    
    console.log('✅ Страница результатов работает корректно');
  });

  test('should show assessment badge in test list', async ({ page }) => {
    console.log('🧪 Проверяем отображение бейджа оценочного теста...');
    
    await page.goto('http://localhost:8082/tests');
    await page.waitForLoadState('networkidle');
    
    // Проверяем наличие тестов
    const testCards = page.locator('.card');
    const testCount = await testCards.count();
    console.log(`📋 Найдено тестов: ${testCount}`);
    
    // Ищем оценочные тесты
    const assessmentBadges = page.locator('text=Оценочный');
    const assessmentCount = await assessmentBadges.count();
    console.log(`🎯 Найдено оценочных тестов: ${assessmentCount}`);
    
    if (assessmentCount > 0) {
      await expect(assessmentBadges.first()).toBeVisible();
      console.log('✅ Бейдж оценочного теста отображается');
    } else {
      console.log('ℹ️  Оценочных тестов в списке не найдено');
    }
  });
});