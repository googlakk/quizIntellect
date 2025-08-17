-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  login_username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table for test categories
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  max_score INTEGER NOT NULL DEFAULT 100,
  time_limit_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'single_choice', 'text')),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create answer_options table for multiple choice questions
CREATE TABLE public.answer_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test_results table for tracking user scores
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  time_taken_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, test_id)
);

-- Create user_answers table for tracking individual answers
CREATE TABLE public.user_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_result_id UUID NOT NULL REFERENCES public.test_results(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_ids UUID[],
  text_answer TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Subjects policies (readable by all, manageable by admins)
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage subjects" ON public.subjects FOR ALL USING (auth.role() = 'authenticated');

-- Tests policies (readable by all, manageable by admins)
CREATE POLICY "Anyone can view active tests" ON public.tests FOR SELECT USING (is_active = true);
CREATE POLICY "Authenticated users can manage tests" ON public.tests FOR ALL USING (auth.role() = 'authenticated');

-- Questions policies
CREATE POLICY "Anyone can view questions from active tests" ON public.questions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.tests t 
    WHERE t.id = test_id AND t.is_active = true
  )
);
CREATE POLICY "Authenticated users can manage questions" ON public.questions FOR ALL USING (auth.role() = 'authenticated');

-- Answer options policies
CREATE POLICY "Anyone can view answer options" ON public.answer_options 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.questions q 
    JOIN public.tests t ON t.id = q.test_id 
    WHERE q.id = question_id AND t.is_active = true
  )
);
CREATE POLICY "Authenticated users can manage answer options" ON public.answer_options FOR ALL USING (auth.role() = 'authenticated');

-- Test results policies
CREATE POLICY "Users can view all test results" ON public.test_results FOR SELECT USING (true);
CREATE POLICY "Users can insert their own results" ON public.test_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own results" ON public.test_results FOR UPDATE USING (auth.uid() = user_id);

-- User answers policies
CREATE POLICY "Users can view all answers" ON public.user_answers FOR SELECT USING (true);
CREATE POLICY "Users can insert answers for their results" ON public.user_answers 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.test_results tr 
    WHERE tr.id = test_result_id AND tr.user_id = auth.uid()
  )
);

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, subject, login_username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Пользователь'),
    COALESCE(NEW.raw_user_meta_data ->> 'subject', 'Не указан'),
    COALESCE(NEW.raw_user_meta_data ->> 'login_username', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample subjects
INSERT INTO public.subjects (name, description) VALUES
('Математика', 'Тесты по математике'),
('Физика', 'Тесты по физике'),
('Химия', 'Тесты по химии'),
('Биология', 'Тесты по биологии'),
('История', 'Тесты по истории'),
('Литература', 'Тесты по литературе'),
('География', 'Тесты по географии'),
('Информатика', 'Тесты по информатике');

-- Enable realtime for all tables
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.test_results REPLICA IDENTITY FULL;
ALTER TABLE public.tests REPLICA IDENTITY FULL;
ALTER TABLE public.subjects REPLICA IDENTITY FULL;