# 🔧 Настройка Gemini API для QuizIntellect

## 1. Получение API ключа

1. Откройте: https://makersuite.google.com/app/apikey
2. Войдите в Google аккаунт
3. Нажмите "Create API key"
4. Скопируйте ключ (формат: AIzaSy...)

## 2. Добавление ключа в Supabase

### Для продакшена:
1. Откройте Supabase Dashboard: https://supabase.com/dashboard
2. Выберите проект QuizIntellect
3. Перейдите в: `Settings → Environment Variables`
4. Добавьте:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: ваш_ключ_gemini

### Для локальной разработки:
Создайте файл `.env.local` в корне проекта:
```bash
GEMINI_API_KEY=AIzaSy...ваш_ключ_здесь
```

## 3. Применение изменений

```bash
# Применить миграцию БД
supabase db push

# Развернуть Edge функцию
supabase functions deploy generate-ai-recommendations

# Или для локальной разработки
supabase functions serve generate-ai-recommendations
```

## 4. Проверка работы

После настройки:
1. Создайте тест с полем "Цель ИИ анализа"
2. Пройдите тест
3. Нажмите "Получить рекомендации ИИ"
4. Получите персональные советы от ИИ!

## 🔒 Безопасность

- ❌ НЕ добавляйте ключ в git
- ✅ Используйте переменные окружения
- ✅ Ключ должен быть доступен только серверу
- ✅ Регулярно ротируйте API ключи