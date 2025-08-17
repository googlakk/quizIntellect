import { chromium } from '@playwright/test';

async function debugHomepage() {
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  // Слушаем ошибки консоли
  page.on('console', msg => {
    console.log(`🔍 CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  // Слушаем ошибки страницы
  page.on('pageerror', error => {
    console.log('❌ PAGE ERROR:', error.message);
  });
  
  try {
    console.log('🚀 Переходим на главную страницу...');
    await page.goto('http://localhost:8081');
    
    // Ждём загрузки страницы
    await page.waitForTimeout(3000);
    
    console.log('📄 Заголовок страницы:', await page.title());
    console.log('🌐 URL:', page.url());
    
    // Проверяем, есть ли элементы аутентификации
    const hasAuthForm = await page.locator('text=Войти').isVisible();
    console.log('🔐 Форма входа видна:', hasAuthForm);
    
    // Проверяем, есть ли элементы дашборда
    const hasDashboard = await page.locator('text=Добро пожаловать в Intellect Pro School').isVisible();
    console.log('🏠 Дашборд виден:', hasDashboard);
    
    // Делаем скриншот
    await page.screenshot({ path: 'debug-homepage.png', fullPage: true });
    console.log('📸 Скриншот сохранён как debug-homepage.png');
    
    // Проверяем localStorage
    const localStorage = await page.evaluate(() => {
      return Object.keys(localStorage).map(key => ({
        key,
        value: localStorage.getItem(key)?.substring(0, 100) + '...'
      }));
    });
    console.log('💾 LocalStorage:', localStorage);
    
  } catch (error) {
    console.log('❌ Ошибка:', error.message);
  }
  
  await browser.close();
}

debugHomepage();