# 🛠️ Устранение проблемы с Edge функцией ИИ

## ❌ Ошибка: "Failed to send a request to the Edge Function"

Эта ошибка означает, что Edge функция недоступна или неправильно настроена.

## 🔍 Диагностика проблемы

### 1. Проверьте развернута ли Edge функция

```bash
# Войдите в директорию проекта
cd "C:\Users\xyz\Documents\Emir code\QuizIntellect"

# Проверьте список функций
supabase functions list

# Если функции нет в списке, разверните её
supabase functions deploy generate-ai-recommendations
```

### 2. Проверьте переменные окружения

В Supabase Dashboard:
1. Откройте проект → **Settings** → **Edge Functions**
2. В разделе **Function Secrets** должна быть:
   - `GEMINI_API_KEY` = ваш_ключ_от_gemini

### 3. Используйте встроенный тестер

1. Откройте админ панель → вкладка **"Тест ИИ"**
2. Нажмите "Протестировать ИИ рекомендации"
3. Проверьте результат и ошибки в консоли браузера

## 🚀 Пошаговое решение

### Шаг 1: Убедитесь что Supabase CLI настроен

```bash
# Проверьте подключение к проекту
supabase status

# Если не подключен, войдите
supabase login

# Подключитесь к проекту (замените на ваш project-ref)
supabase link --project-ref your-project-ref
```

### Шаг 2: Разверните Edge функцию

```bash
# Разверните функцию
supabase functions deploy generate-ai-recommendations

# Проверьте что функция появилась
supabase functions list
```

### Шаг 3: Настройте переменные окружения

1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект QuizIntellect
3. Перейдите в **Settings** → **Edge Functions**
4. В разделе **Function Secrets** добавьте:
   ```
   GEMINI_API_KEY = ваш_ключ_от_google
   ```

### Шаг 4: Получите Gemini API ключ (если нет)

1. Откройте [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Войдите в Google аккаунт
3. Нажмите **"Create API key"**
4. Скопируйте ключ (формат: `AIzaSy...`)
5. Добавьте в Supabase Edge Function Secrets

### Шаг 5: Протестируйте функцию

1. В админ панели → **"Тест ИИ"** → нажмите кнопку теста
2. Если работает ✅ - проблема решена!
3. Если не работает ❌ - смотрите логи

## 📊 Проверка логов

### В браузере (F12 → Console):
```javascript
// Должны появиться логи:
"Отправляем запрос к Edge функции с параметрами:"
"Ответ от Edge функции:"
```

### В Supabase Dashboard:
1. **Edge Functions** → **generate-ai-recommendations**
2. Вкладка **"Logs"** - смотрите ошибки
3. Вкладка **"Metrics"** - смотрите статистику вызовов

## 🛡️ Частые проблемы и решения

### Проблема: "Function not found"
**Решение**: Edge функция не развернута
```bash
supabase functions deploy generate-ai-recommendations
```

### Проблема: "GEMINI_API_KEY не настроен"
**Решение**: Добавьте API ключ в Function Secrets

### Проблема: "Invalid API key"
**Решение**: Проверьте корректность Gemini API ключа

### Проблема: "Network error"
**Решение**: Проверьте интернет-соединение и статус Supabase

### Проблема: "Quota exceeded" 
**Решение**: Превышен лимит Gemini API - подождите или увеличьте квоту

## 🔧 Альтернативная диагностика

Если проблемы продолжаются, проверьте:

1. **Статус Supabase**: https://status.supabase.com
2. **Версия CLI**: `supabase --version`
3. **Права доступа**: убедитесь что вы владелец проекта

## 📞 Получение помощи

Если ничего не помогает:

1. **Логи Edge функции**: скопируйте из Supabase Dashboard
2. **Консоль браузера**: скопируйте ошибки из F12
3. **Команды**: результат `supabase functions list`

С этой информацией обратитесь за поддержкой.

---

**После выполнения этих шагов ИИ рекомендации должны заработать!** 🤖✨