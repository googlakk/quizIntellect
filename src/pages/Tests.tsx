import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  Target, 
  Users,
  Trophy,
  ArrowRight,
  Filter
} from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  time_limit_minutes: number | null;
  is_active: boolean;
  created_at: string;
  categories: {
    id: string;
    name: string;
  };
  questions: { id: string }[];
  _count?: {
    test_results: number;
  };
}

interface TestResult {
  percentage: number;
  completed_at: string;
}

const Tests = () => {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const location = useLocation();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [userResults, setUserResults] = useState<Record<string, TestResult>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchTests();
    fetchCategories();
    if (user) {
      fetchUserResults();
    }
  }, [user]);

  // Обновляем данные когда пользователь возвращается на страницу
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        fetchUserResults();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  // Обновляем данные при изменении маршрута (возврат с других страниц)
  useEffect(() => {
    if (user && location.pathname === '/tests') {
      fetchUserResults();
    }
  }, [location.pathname, user]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCategories(data);
    }
  };

  const fetchTests = async () => {
    try {
      const { data } = await supabase
        .from('tests')
        .select(`
          *,
          categories:category_id (id, name),
          questions (id)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (data) {
        setTests(data as Test[]);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserResults = async () => {
    if (!user) return;

    console.log('🔄 Обновляем результаты пользователя...');

    const { data, error } = await supabase
      .from('test_results')
      .select('test_id, percentage, completed_at')
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Ошибка при загрузке результатов:', error);
      return;
    }

    if (data) {
      console.log(`✅ Загружено ${data.length} результатов тестов`);
      const resultsMap: Record<string, TestResult> = {};
      data.forEach(result => {
        resultsMap[result.test_id] = {
          percentage: result.percentage,
          completed_at: result.completed_at
        };
      });
      setUserResults(resultsMap);
    }
  };

  const filteredTests = selectedCategory === 'all' 
    ? tests 
    : tests.filter(test => test.categories.id === selectedCategory);

  const completedTests = filteredTests.filter(test => userResults[test.id]);
  const availableTests = filteredTests.filter(test => !userResults[test.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="h-8 bg-muted rounded w-64 mx-auto mb-4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-3 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
          Доступные тесты
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Выберите тест для прохождения и проверьте свои знания
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <Filter className="w-5 h-5 text-muted-foreground" />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-md px-3 py-2 bg-background"
        >
          <option value="all">Все разделы</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего тестов</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTests.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пройдено</CardTitle>
            <Trophy className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTests.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доступно</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableTests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tests Tabs */}
      <Tabs defaultValue="available" className="w-full" onValueChange={(value) => {
        if (value === 'completed' && user) {
          // Обновляем результаты при переходе на вкладку завершенных тестов
          fetchUserResults();
        }
      }}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">
            Доступные тесты ({availableTests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Завершенные тесты ({completedTests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="available" className="mt-6">
          {availableTests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableTests.map((test) => (
                <TestCard key={test.id} test={test} />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет доступных тестов</h3>
                <p className="text-muted-foreground">
                  {selectedCategory === 'all' 
                    ? 'Все тесты уже пройдены или отсутствуют'
                    : 'Нет тестов по выбранному разделу'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="completed" className="mt-6">
          {completedTests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedTests.map((test) => (
                <CompletedTestCard 
                  key={test.id} 
                  test={test} 
                  result={userResults[test.id]} 
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Нет завершенных тестов</h3>
                <p className="text-muted-foreground">
                  Пройдите первый тест, чтобы увидеть результаты здесь
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const TestCard = ({ test }: { test: Test }) => {
  return (
    <Card className="hover:shadow-strong transition-shadow duration-medium cursor-pointer group">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {test.title}
            </CardTitle>
            <CardDescription className="mt-1">
              {test.categories.name}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {test.questions.length} вопросов
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {test.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {test.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <Target className="w-4 h-4 mr-1" />
            {test.max_score} баллов
          </div>
          {test.time_limit_minutes && (
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {test.time_limit_minutes} мин
            </div>
          )}
        </div>
        
        <Button asChild className="w-full group-hover:shadow-medium transition-shadow">
          <Link to={`/test/${test.id}`}>
            Начать тест
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

const CompletedTestCard = ({ test, result }: { test: Test; result: TestResult }) => {
  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card className="hover:shadow-medium transition-shadow duration-medium">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{test.title}</CardTitle>
            <CardDescription className="mt-1">
              {test.categories.name}
            </CardDescription>
          </div>
          <Badge variant={getScoreBadge(result.percentage)}>
            {Math.round(result.percentage)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Результат:</span>
          <span className={`font-bold ${getScoreColor(result.percentage)}`}>
            {Math.round(result.percentage)}% 
            ({Math.round((result.percentage / 100) * test.max_score)}/{test.max_score})
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Дата прохождения:</span>
          <span>{new Date(result.completed_at).toLocaleDateString('ru-RU')}</span>
        </div>
        
        <Button variant="outline" className="w-full" asChild>
          <Link to={`/test/${test.id}/result`}>
            Посмотреть результат
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default Tests;