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
  XCircle
} from 'lucide-react';

interface TestResult {
  id: string;
  score: number;
  max_score: number;
  percentage: number;
  time_taken_minutes: number;
  completed_at: string;
  tests: {
    title: string;
    description: string;
    categories: {
      name: string;
    };
  };
}

const TestResult = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId && user) {
      fetchTestResult();
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
            categories:category_id (name)
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

  const getGradeInfo = (percentage: number) => {
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

  const gradeInfo = getGradeInfo(result.percentage);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {gradeInfo.icon}
          </div>
          <CardTitle className="text-3xl">Тест завершен!</CardTitle>
          <CardDescription className="text-lg">
            {result.tests.title} - {result.tests.categories.name}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Card */}
        <Card className={gradeInfo.bgColor}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Ваш результат</span>
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
                </div>
              </div>
              <Progress value={result.percentage} className="h-3" />
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
                  <span className="text-sm">Правильных ответов</span>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestResult;