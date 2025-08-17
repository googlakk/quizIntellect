-- Исправление функции создания профиля для поддержки поля category

-- Просто заменяем функцию (CREATE OR REPLACE автоматически обновит существующую)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, category, login_username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Пользователь'),
    COALESCE(NEW.raw_user_meta_data ->> 'category', 'Не указана'),
    COALESCE(NEW.raw_user_meta_data ->> 'login_username', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем результат
SELECT 'Функция handle_new_user обновлена успешно! Теперь регистрация пользователей должна работать.' as result;