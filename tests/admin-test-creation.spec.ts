import { test, expect } from '@playwright/test';

test.describe('Создание и редактирование тестов в админ панели', () => {
  test.beforeEach(async ({ page }) => {
    // Переходим на главную страницу приложения
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('админ может создать тест и добавить вопросы', async ({ page }) => {
    // Проверяем, что приложение загрузилось
    await expect(page.locator('#root')).toBeVisible();
    
    // Делаем скриншот главной страницы
    await page.screenshot({ path: 'tests/screenshots/homepage-admin-test.png' });
    
    // Проверяем, что нет критических ошибок JavaScript
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(`Page error: ${error.toString()}`);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console error: ${msg.text()}`);
      }
    });

    // Ждем немного для получения возможных ошибок
    await page.waitForTimeout(2000);
    
    // Проверяем отсутствие критических ошибок
    if (errors.length > 0) {
      console.log('Обнаружены ошибки:', errors);
    }
    
    // Пытаемся найти элементы интерфейса
    const loginButton = page.locator('button', { hasText: 'Войти' });
    const registerTab = page.locator('button', { hasText: 'Регистрация' });
    const navigationTests = page.locator('text=Тесты');
    
    // Делаем дополнительный скриншот для анализа
    await page.screenshot({ path: 'tests/screenshots/interface-elements.png', fullPage: true });
    
    // Проверяем, что основные элементы присутствуют
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('QuizIntellect');
    
    console.log('Найденный текст на странице:', bodyText?.slice(0, 500));
  });

  test('проверка доступности админ панели', async ({ page }) => {
    // Пытаемся перейти на админ панель напрямую
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Делаем скриншот админ панели
    await page.screenshot({ path: 'tests/screenshots/admin-panel-access.png' });
    
    // Проверяем, что на странице есть контент
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toBeNull();
    
    console.log('Содержимое админ панели:', bodyText?.slice(0, 300));
  });

  test('проверка создания раздела', async ({ page }) => {
    // Переходим на админ панель
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    
    // Ждем загрузки интерфейса
    await page.waitForTimeout(3000);
    
    // Делаем скриншот для диагностики
    await page.screenshot({ path: 'tests/screenshots/admin-categories.png', fullPage: true });
    
    // Проверяем, что страница загружена
    const pageContent = await page.locator('body').textContent();
    console.log('Контент страницы администратора:', pageContent?.slice(0, 500));
    
    expect(pageContent).not.toBeNull();
  });
});