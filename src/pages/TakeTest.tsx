import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  answer_options: {
    id: string;
    option_text: string;
    order_index: number;
    is_correct: boolean;
  }[];
}

interface Test {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  time_limit_minutes: number | null;
  categories: {
    name: string;
  };
  questions: Question[];
}

interface UserAnswer {
  questionId: string;
  selectedOptions: string[];
  textAnswer: string;
}

const TakeTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(new Date());

  useEffect(() => {
    if (testId) {
      fetchTest();
    }
  }, [testId]);

  useEffect(() => {
    if (test?.time_limit_minutes && timeLeft === null) {
      setTimeLeft(test.time_limit_minutes * 60);
    }
  }, [test]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev && prev <= 1) {
            handleSubmitTest();
            return 0;
          }
          return prev ? prev - 1 : 0;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  const fetchTest = async () => {
    try {
      // Check if user already completed this test
      if (user) {
        const { data: existingResult } = await supabase
          .from('test_results')
          .select('id')
          .eq('test_id', testId)
          .eq('user_id', user.id)
          .single();

        if (existingResult) {
          toast({
            title: "Тест уже пройден",
            description: "Вы уже проходили этот тест",
            variant: "destructive"
          });
          navigate('/tests');
          return;
        }
      }

      const { data, error } = await supabase
        .from('tests')
        .select(`
          *,
          categories:category_id (name),
          questions (
            *,
            answer_options (
              id,
              option_text,
              order_index,
              is_correct
            )
          )
        `)
        .eq('id', testId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        toast({
          title: "Ошибка",
          description: "Тест не найден или недоступен",
          variant: "destructive"
        });
        navigate('/tests');
        return;
      }

      // Sort questions and options by order_index
      const sortedQuestions = data.questions
        .sort((a, b) => a.order_index - b.order_index)
        .map(q => ({
          ...q,
          answer_options: q.answer_options.sort((a, b) => a.order_index - b.order_index)
        }));

      setTest({ ...data, questions: sortedQuestions } as Test);
    } catch (error) {
      console.error('Error fetching test:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить тест",
        variant: "destructive"
      });
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[], isText = false) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedOptions: isText ? [] : Array.isArray(value) ? value : [value],
        textAnswer: isText ? (value as string) : ''
      }
    }));
  };

  const handleSubmitTest = async () => {
    if (!test || !user || submitting) return;

    setSubmitting(true);

    try {
      const endTime = new Date();
      const timeTakenMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));

      // Calculate score
      let totalScore = 0;
      const answersToSave = [];

      for (const question of test.questions) {
        const userAnswer = userAnswers[question.id];
        let isCorrect = false;
        let pointsEarned = 0;

        if (question.question_type === 'multiple_choice' || question.question_type === 'single_choice') {
          const correctOptions = question.answer_options
            .filter(opt => opt.is_correct)
            .map(opt => opt.id);

          if (userAnswer?.selectedOptions.length === correctOptions.length &&
              userAnswer.selectedOptions.every(id => correctOptions.includes(id))) {
            isCorrect = true;
            pointsEarned = question.points;
            totalScore += pointsEarned;
          }
        }

        answersToSave.push({
          question_id: question.id,
          selected_option_ids: userAnswer?.selectedOptions || [],
          text_answer: userAnswer?.textAnswer || null,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      }

      const percentage = (totalScore / test.max_score) * 100;

      // Save test result
      const { data: testResult, error: resultError } = await supabase
        .from('test_results')
        .insert({
          test_id: test.id,
          user_id: user.id,
          score: totalScore,
          max_score: test.max_score,
          percentage: percentage,
          time_taken_minutes: timeTakenMinutes
        })
        .select()
        .single();

      if (resultError) throw resultError;

      // Save user answers
      const answersWithResultId = answersToSave.map(answer => ({
        ...answer,
        test_result_id: testResult.id
      }));

      const { error: answersError } = await supabase
        .from('user_answers')
        .insert(answersWithResultId);

      if (answersError) throw answersError;

      toast({
        title: "Тест завершен!",
        description: `Ваш результат: ${Math.round(percentage)}% (${totalScore}/${test.max_score})`,
      });

      // Небольшая задержка, чтобы данные успели сохраниться
      setTimeout(() => {
        navigate(`/test/${test.id}/result`);
      }, 500);
    } catch (error) {
      console.error('Error submitting test:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить результаты теста",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getAnsweredQuestionsCount = () => {
    return Object.keys(userAnswers).length;
  };

  if (loading || !test) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = test.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{test.title}</CardTitle>
              <CardDescription>{test.categories.name}</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              {timeLeft !== null && (
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span className={`font-mono ${timeLeft < 300 ? 'text-red-600' : ''}`}>
                    {formatTime(timeLeft)}
                  </span>
                </div>
              )}
              <Badge variant="outline">
                {getAnsweredQuestionsCount()}/{test.questions.length} отвечено
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Вопрос {currentQuestionIndex + 1} из {test.questions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {currentQuestion.question_text}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {currentQuestion.points} {currentQuestion.points === 1 ? 'балл' : 'баллов'}
            </Badge>
            {userAnswers[currentQuestion.id] && (
              <Badge variant="default" className="flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Отвечено
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <QuestionComponent
            question={currentQuestion}
            userAnswer={userAnswers[currentQuestion.id]}
            onAnswerChange={handleAnswerChange}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Предыдущий
        </Button>

        <div className="flex space-x-2">
          {currentQuestionIndex === test.questions.length - 1 ? (
            <Button
              onClick={handleSubmitTest}
              disabled={submitting}
              className="flex items-center"
            >
              <Flag className="w-4 h-4 mr-2" />
              {submitting ? 'Завершение...' : 'Завершить тест'}
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentQuestionIndex(prev => Math.min(test.questions.length - 1, prev + 1))}
            >
              Следующий
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Навигация по вопросам</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {test.questions.map((_, index) => (
              <Button
                key={index}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                className={`w-10 h-10 p-0 ${
                  userAnswers[test.questions[index].id] ? 'bg-green-100 border-green-300' : ''
                }`}
                onClick={() => setCurrentQuestionIndex(index)}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const QuestionComponent = ({ 
  question, 
  userAnswer, 
  onAnswerChange 
}: { 
  question: Question;
  userAnswer?: UserAnswer;
  onAnswerChange: (questionId: string, value: string | string[], isText?: boolean) => void;
}) => {
  if (question.question_type === 'single_choice') {
    return (
      <RadioGroup
        value={userAnswer?.selectedOptions[0] || ''}
        onValueChange={(value) => onAnswerChange(question.id, value)}
      >
        {question.answer_options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              {option.option_text}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  if (question.question_type === 'multiple_choice') {
    return (
      <div className="space-y-3">
        {question.answer_options.map((option) => (
          <div key={option.id} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 transition-colors">
            <Checkbox
              id={option.id}
              checked={userAnswer?.selectedOptions.includes(option.id) || false}
              onCheckedChange={(checked) => {
                const currentOptions = userAnswer?.selectedOptions || [];
                const newOptions = checked
                  ? [...currentOptions, option.id]
                  : currentOptions.filter(id => id !== option.id);
                onAnswerChange(question.id, newOptions);
              }}
            />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              {option.option_text}
            </Label>
          </div>
        ))}
      </div>
    );
  }

  if (question.question_type === 'text') {
    return (
      <Textarea
        placeholder="Введите ваш ответ..."
        value={userAnswer?.textAnswer || ''}
        onChange={(e) => onAnswerChange(question.id, e.target.value, true)}
        className="min-h-[100px]"
      />
    );
  }

  return (
    <div className="flex items-center p-4 border rounded-lg bg-yellow-50 border-yellow-200">
      <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
      <span className="text-yellow-800">Неподдерживаемый тип вопроса: {question.question_type}</span>
    </div>
  );
};

export default TakeTest;