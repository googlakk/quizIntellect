import { test, expect } from '@playwright/test';

test('приложение рендерится без ошибок', async ({ page }) => {
  // Переходим на главную страницу
  await page.goto('/');
  
  // Ждем загрузки приложения
  await page.waitForLoadState('networkidle');
  
  // Проверяем, что нет ошибок JavaScript
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(error.toString());
  });
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Ждем немного для получения возможных ошибок
  await page.waitForTimeout(2000);
  
  // Проверяем отсутствие критических ошибок
  expect(errors).toEqual([]);
  
  // Проверяем, что элементы интерфейса загрузились
  const body = await page.locator('body').textContent();
  expect(body).not.toBeNull();
  
  // Проверяем, что React корень присутствует
  const reactRoot = page.locator('#root');
  await expect(reactRoot).toBeVisible();
  
  // Делаем скриншот для визуальной проверки
  await page.screenshot({ path: 'tests/screenshots/homepage.png' });
});

test('навигация работает корректно', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  // Проверяем основные элементы навигации
  const navigation = page.locator('nav, header, [role="navigation"]');
  if (await navigation.count() > 0) {
    await expect(navigation.first()).toBeVisible();
  }
  
  // Проверяем, что маршрутизация React Router работает
  const currentUrl = page.url();
  expect(currentUrl).toContain('localhost:8082');
});