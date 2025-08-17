import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock,
  Users,
  Award,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  totalTests: number;
  completedTests: number;
  averageScore: number;
  ranking: number;
  totalUsers: number;
}

interface RecentTest {
  id: string;
  title: string;
  subject: string;
  score: number;
  max_score: number;
  percentage: number;
  completed_at: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTests, setRecentTests] = useState<RecentTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch user stats
      const { data: results } = await supabase
        .from('test_results')
        .select(`
          *,
          tests:test_id (
            title,
            subjects:subject_id (name)
          )
        `)
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      // Fetch total tests count
      const { count: totalTests } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch total users count
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Calculate stats
      const completedTests = results?.length || 0;
      const averageScore = results && results.length > 0 
        ? results.reduce((sum, r) => sum + r.percentage, 0) / results.length 
        : 0;

      // Get ranking (simplified - could be improved with proper ranking logic)
      const { data: allUserResults } = await supabase
        .from('test_results')
        .select('user_id, percentage')
        .order('percentage', { ascending: false });

      const userAverages = new Map();
      allUserResults?.forEach(result => {
        const userId = result.user_id;
        if (!userAverages.has(userId)) {
          userAverages.set(userId, []);
        }
        userAverages.get(userId).push(result.percentage);
      });

      const averages = Array.from(userAverages.entries()).map(([userId, scores]) => ({
        userId,
        average: scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      })).sort((a, b) => b.average - a.average);

      const ranking = averages.findIndex(avg => avg.userId === user.id) + 1;

      setStats({
        totalTests: totalTests || 0,
        completedTests,
        averageScore,
        ranking,
        totalUsers: totalUsers || 0
      });

      // Format recent tests
      const formattedRecentTests = results?.slice(0, 5).map(result => ({
        id: result.id,
        title: result.tests?.title || 'Неизвестный тест',
        subject: result.tests?.subjects?.name || 'Неизвестный предмет',
        score: result.score,
        max_score: result.max_score,
        percentage: result.percentage,
        completed_at: result.completed_at
      })) || [];

      setRecentTests(formattedRecentTests);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4">
          Добро пожаловать в QuizForge
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Изучайте, тестируйтесь и отслеживайте свой прогресс в режиме реального времени
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-medium hover:shadow-strong transition-shadow duration-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего тестов</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.totalTests}</div>
            <p className="text-xs text-muted-foreground">
              Доступно для прохождения
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-strong transition-shadow duration-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пройдено</CardTitle>
            <Target className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats?.completedTests}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalTests ? Math.round((stats.completedTests / stats.totalTests) * 100) : 0}% от всех тестов
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-strong transition-shadow duration-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средний балл</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {stats?.averageScore ? Math.round(stats.averageScore) : 0}%
            </div>
            <Progress 
              value={stats?.averageScore || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card className="shadow-medium hover:shadow-strong transition-shadow duration-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Рейтинг</CardTitle>
            <Trophy className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              #{stats?.ranking || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              из {stats?.totalUsers} участников
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tests */}
        <div className="lg:col-span-2">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-primary" />
                Последние результаты
              </CardTitle>
              <CardDescription>
                Ваши недавно пройденные тесты
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentTests.length > 0 ? (
                <div className="space-y-4">
                  {recentTests.map((test) => (
                    <div key={test.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/5 transition-colors duration-medium">
                      <div className="flex-1">
                        <h4 className="font-medium">{test.title}</h4>
                        <p className="text-sm text-muted-foreground">{test.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(test.completed_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={test.percentage >= 80 ? "default" : test.percentage >= 60 ? "secondary" : "destructive"}
                          className="font-bold"
                        >
                          {test.score}/{test.max_score}
                        </Badge>
                        <span className="text-sm font-medium">
                          {Math.round(test.percentage)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">Вы еще не прошли ни одного теста</p>
                  <Button asChild className="mt-4" variant="default">
                    <Link to="/tests">Пройти первый тест</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2 text-secondary" />
                Быстрые действия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" variant="default">
                <Link to="/tests">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Пройти тест
                </Link>
              </Button>
              <Button asChild className="w-full" variant="secondary">
                <Link to="/leaderboard">
                  <Trophy className="w-4 h-4 mr-2" />
                  Таблица лидеров
                </Link>
              </Button>
              <Button asChild className="w-full" variant="accent">
                <Link to="/admin">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Панель админа
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-medium bg-gradient-subtle">
            <CardHeader>
              <CardTitle className="text-center">Мотивация дня</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-sm text-muted-foreground italic">
                "Знание - это сила, а тестирование - путь к совершенству!"
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;