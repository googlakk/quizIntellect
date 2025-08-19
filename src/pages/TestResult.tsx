import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Clock, 
  Target,
  Home,
  BarChart3,
  CheckCircle,
  XCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import AIRecommendations from '@/components/AIRecommendations';
import { useAIRecommendations } from '@/hooks/useAIRecommendations';

interface TestResult {
  id: string;
  score: number;
  max_score: number;
  percentage: number;
  time_taken_minutes: number;
  completed_at: string;
  answers: any[];
  tests: {
    title: string;
    description: string;
    test_type: string;
    ai_goal: string | null;
    categories: {
      name: string;
    };
    questions: any[];
  };
}

const TestResult = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { generateRecommendations, checkExistingRecommendations, generating } = useAIRecommendations();
  
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [hasRecommendations, setHasRecommendations] = useState(false);

  useEffect(() => {
    if (testId && user) {
      fetchTestResult();
      fetchProfile();
    }
  }, [testId, user]);

  const fetchTestResult = async () => {
    try {
      console.log('Fetching test result for:', { testId, userId: user?.id });
      
      const { data, error } = await supabase
        .from('test_results')
        .select(`
          *,
          tests (
            title,
            description,
            test_type,
            ai_goal,
            categories:category_id (name),
            questions (
              id,
              question_text,
              question_type,
              points
            )
          )
        `)
        .eq('test_id', testId)
        .eq('user_id', user?.id)
        .order('completed_at', { ascending: false })
        .single();

      console.log('Test result query:', { data, error });

      if (error || !data) {
        console.error('Test result not found:', error);
        toast({
          title: "Ошибка",
          description: `Результат теста не найден: ${error?.message || 'Неизвестная ошибка'}`,
          variant: "destructive"
        });
        navigate('/tests');
        return;
      }

      setResult(data as TestResult);
      
      // Проверяем, есть ли уже рекомендации для этого результата
      if (data.tests.ai_goal && user?.id) {
        const hasExisting = await checkExistingRecommendations(data.id, user.id);
        setHasRecommendations(hasExisting);
      }
    } catch (error) {
      console.error('Error fetching test result:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить результат теста",
        variant: "destructive"
      });
      navigate('/tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user?.id)
        .single();

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleGenerateRecommendations = async () => {
    if (!result || !user || !profile) {
      console.error('Отсутствуют необходимые данные:', { result: !!result, user: !!user, profile: !!profile });
      return;
    }

    if (!result.tests.ai_goal) {
      toast({
        title: "Ошибка",
        description: "У этого теста не настроена цель ИИ анализа",
        variant: "destructive"
      });
      return;
    }

    console.log('Данные для генерации рекомендаций:', {
      testResultId: result.id,
      userId: user.id,
      testId: testId,
      aiGoal: result.tests.ai_goal,
      answersCount: result.answers?.length || 0,
      questionsCount: result.tests.questions?.length || 0,
      userProfile: profile.full_name
    });

    try {
      // Получаем ответы пользователя из базы данных, если они не загружены
      let userAnswers = result.answers || [];
      
      if (!userAnswers || userAnswers.length === 0) {
        console.log('Загружаем ответы пользователя из базы данных...');
        const { data: answersData, error: answersError } = await supabase
          .from('user_answers')
          .select('*')
          .eq('test_result_id', result.id)
          .order('question_order');

        if (!answersError && answersData) {
          userAnswers = answersData;
          console.log('Загружено ответов:', userAnswers.length);
        }
      }

      await generateRecommendations({
        testResultId: result.id,
        userId: user.id,
        testId: testId!,
        aiGoal: result.tests.ai_goal!,
        userAnswers: userAnswers,
        testData: {
          title: result.tests.title,
          description: result.tests.description || '',
          questions: result.tests.questions || []
        },
        userProfile: {
          full_name: profile.full_name
        }
      });

      setHasRecommendations(true);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      toast({
        title: "Ошибка генерации рекомендаций",
        description: "Попробуйте еще раз или обратитесь к администратору",
        variant: "destructive"
      });
    }
  };

  const getGradeInfo = (percentage: number, isAssessment: boolean = false) => {
    if (isAssessment) {
      // Для оценочных тестов показываем результат как самооценку
      return { 
        grade: 'Самооценка завершена', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <CheckCircle className="w-5 h-5 text-blue-600" />
      };
    }

    if (percentage >= 90) {
      return { 
        grade: 'Отлично', 
        color: 'text-green-600', 
        bgColor: 'bg-green-50 border-green-200',
        icon: <Trophy className="w-5 h-5 text-green-600" />
      };
    } else if (percentage >= 75) {
      return { 
        grade: 'Хорошо', 
        color: 'text-blue-600', 
        bgColor: 'bg-blue-50 border-blue-200',
        icon: <CheckCircle className="w-5 h-5 text-blue-600" />
      };
    } else if (percentage >= 60) {
      return { 
        grade: 'Удовлетворительно', 
        color: 'text-yellow-600', 
        bgColor: 'bg-yellow-50 border-yellow-200',
        icon: <Target className="w-5 h-5 text-yellow-600" />
      };
    } else {
      return { 
        grade: 'Неудовлетворительно', 
        color: 'text-red-600', 
        bgColor: 'bg-red-50 border-red-200',
        icon: <XCircle className="w-5 h-5 text-red-600" />
      };
    }
  };

  if (loading || !result) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAssessment = result.tests.test_type === 'assessment';
  const gradeInfo = getGradeInfo(result.percentage, isAssessment);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {gradeInfo.icon}
          </div>
          <CardTitle className="text-3xl">
            {isAssessment ? 'Самооценка завершена!' : 'Тест завершен!'}
          </CardTitle>
          <CardDescription className="text-lg">
            {result.tests.title} - {result.tests.categories.name}
            {isAssessment && (
              <div className="mt-2 text-sm text-muted-foreground">
                Оценочный тест - результат отражает вашу самооценку навыков
              </div>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Card */}
        <Card className={gradeInfo.bgColor}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isAssessment ? 'Ваша самооценка' : 'Ваш результат'}</span>
              <Badge variant="outline" className={gradeInfo.color}>
                {gradeInfo.grade}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {Math.round(result.percentage)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {result.score} из {result.max_score} баллов
                  {isAssessment && ' (самооценка)'}
                </div>
              </div>
              <Progress value={result.percentage} className="h-3" />
              {isAssessment && (
                <div className="text-xs text-center text-muted-foreground">
                  Результат основан на вашей самооценке навыков и знаний
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle>Статистика</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Время прохождения</span>
                </div>
                <span className="font-medium">
                  {result.time_taken_minutes} {result.time_taken_minutes === 1 ? 'минута' : 'минут'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {isAssessment ? 'Уровень самооценки' : 'Правильных ответов'}
                  </span>
                </div>
                <span className="font-medium">
                  {Math.round((result.score / result.max_score) * 100)}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Дата прохождения</span>
                </div>
                <span className="font-medium">
                  {new Date(result.completed_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations Section */}
      {result?.tests.ai_goal && (
        <div className="space-y-4">
          {!hasRecommendations ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span>Персональные рекомендации ИИ</span>
                </CardTitle>
                <CardDescription>
                  Получите индивидуальные советы и рекомендации на основе ваших ответов
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-sm font-medium mb-1">Цель анализа:</div>
                    <div className="text-sm text-muted-foreground">{result.tests.ai_goal}</div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateRecommendations}
                    disabled={generating}
                    className="w-full"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Анализирую ваши ответы...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Получить рекомендации ИИ
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary mr-2" />
                  Ваши персональные рекомендации
                </h3>
                <p className="text-muted-foreground">
                  ИИ проанализировал ваши ответы и подготовил индивидуальные советы
                </p>
              </div>
              
              <AIRecommendations testResultId={result.id} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="default">
              <Link to="/tests">
                <Home className="w-4 h-4 mr-2" />
                К списку тестов
              </Link>
            </Button>
            
            <Button asChild variant="outline">
              <Link to="/leaderboard">
                <BarChart3 className="w-4 h-4 mr-2" />
                Посмотреть рейтинг
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link to="/recommendations">
                <Sparkles className="w-4 h-4 mr-2" />
                Все рекомендации
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestResult;