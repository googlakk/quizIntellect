import { z } from 'zod';

// Auth validation schemas
export const signInSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

export const signUpSchema = z.object({
  email: z.string().email('Некорректный email адрес'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  fullName: z.string().min(2, 'ФИО должно содержать минимум 2 символа'),
  category: z.string().min(2, 'Название категории должно содержать минимум 2 символа'),
  loginUsername: z.string().min(3, 'Логин должен содержать минимум 3 символа')
    .regex(/^[a-zA-Z0-9_]+$/, 'Логин может содержать только буквы, цифры и подчеркивания'),
});

// Test management validation schemas
export const createTestSchema = z.object({
  title: z.string().min(3, 'Название теста должно содержать минимум 3 символа'),
  description: z.string().optional(),
  subject_id: z.string().uuid('Выберите корректный предмет'),
  time_limit_minutes: z.number().min(1, 'Лимит времени должен быть больше 0').optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2, 'Название предмета должно содержать минимум 2 символа'),
  description: z.string().optional(),
});

// Question validation schemas
export const createQuestionSchema = z.object({
  question_text: z.string().min(10, 'Текст вопроса должен содержать минимум 10 символов'),
  question_type: z.enum(['single_choice', 'multiple_choice', 'text'], {
    required_error: 'Выберите тип вопроса',
  }),
  points: z.number().min(1, 'Количество баллов должно быть больше 0'),
  order_index: z.number().min(0, 'Порядковый номер не может быть отрицательным'),
});

export const answerOptionSchema = z.object({
  option_text: z.string().min(1, 'Текст варианта ответа обязателен'),
  is_correct: z.boolean(),
  order_index: z.number().min(0, 'Порядковый номер не может быть отрицательным'),
});

export const createQuestionWithOptionsSchema = createQuestionSchema.extend({
  answer_options: z.array(answerOptionSchema).min(2, 'Необходимо минимум 2 варианта ответа')
    .refine(
      (options) => {
        const correctOptions = options.filter(option => option.is_correct);
        return correctOptions.length >= 1;
      },
      {
        message: 'Должен быть выбран минимум один правильный ответ',
      }
    ),
});

// User profile validation schema
export const updateProfileSchema = z.object({
  full_name: z.string().min(2, 'ФИО должно содержать минимум 2 символа'),
  category: z.string().min(2, 'Название категории должно содержать минимум 2 символа'),
  login_username: z.string().min(3, 'Логин должен содержать минимум 3 символа')
    .regex(/^[a-zA-Z0-9_]+$/, 'Логин может содержать только буквы, цифры и подчеркивания'),
});

// Search and filter validation schemas
export const searchSchema = z.object({
  query: z.string().max(100, 'Поисковый запрос не может превышать 100 символов'),
  subject_id: z.string().uuid().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
});

// Import test validation schemas
export const importAnswerOptionSchema = z.object({
  text: z.string().min(1, 'Текст варианта ответа обязателен'),
  correct: z.boolean(),
});

export const importQuestionSchema = z.object({
  question_text: z.string().min(10, 'Текст вопроса должен содержать минимум 10 символов'),
  question_type: z.enum(['single_choice', 'multiple_choice', 'text'], {
    required_error: 'Выберите тип вопроса',
  }),
  points: z.number().min(1, 'Количество баллов должно быть больше 0').default(1),
  options: z.array(importAnswerOptionSchema).min(2, 'Необходимо минимум 2 варианта ответа')
    .refine(
      (options) => {
        const correctOptions = options.filter(option => option.correct);
        return correctOptions.length >= 1;
      },
      {
        message: 'Должен быть выбран минимум один правильный ответ',
      }
    ).optional(),
});

export const importTestSchema = z.object({
  title: z.string().min(3, 'Название теста должно содержать минимум 3 символа'),
  description: z.string().optional(),
  category: z.string().min(2, 'Название категории должно содержать минимум 2 символа'),
  time_limit_minutes: z.number().min(1, 'Лимит времени должен быть больше 0').optional(),
  questions: z.array(importQuestionSchema).min(1, 'Тест должен содержать минимум 1 вопрос'),
});

// Export types for TypeScript
export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type CreateTestFormData = z.infer<typeof createTestSchema>;
export type CreateSubjectFormData = z.infer<typeof createSubjectSchema>;
export type CreateQuestionFormData = z.infer<typeof createQuestionSchema>;
export type CreateQuestionWithOptionsFormData = z.infer<typeof createQuestionWithOptionsSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;
export type SearchFormData = z.infer<typeof searchSchema>;
export type ImportTestFormData = z.infer<typeof importTestSchema>;
export type ImportQuestionFormData = z.infer<typeof importQuestionSchema>;
export type ImportAnswerOptionFormData = z.infer<typeof importAnswerOptionSchema>;