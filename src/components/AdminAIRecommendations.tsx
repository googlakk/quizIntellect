import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  Calendar, 
  User, 
  BookOpen, 
  Search,
  Filter,
  Download,
  Eye,
  TrendingUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface AIRecommendation {
  id: string;
  test_id: string;
  user_id: string;
  ai_goal: string;
  recommendations: string;
  generated_at: string;
  created_at: string;
  test_results: {
    score: number;
    percentage: number;
    completed_at: string;
  };
  tests: {
    title: string;
    description: string | null;
  };
  profiles: {
    full_name: string;
    login_username: string;
  };
}

const AdminAIRecommendations = () => {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [tests, setTests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRecommendations: 0,
    uniqueUsers: 0,
    testsWithAI: 0,
    avgScore: 0
  });

  useEffect(() => {
    fetchRecommendations();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedTest, selectedUser]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select(`
          *,
          test_results (
            score,
            percentage,
            completed_at
          ),
          tests (
            title,
            description
          ),
          profiles (
            full_name,
            login_username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setRecommendations(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Получаем тесты с ИИ целями
      const { data: testsData } = await supabase
        .from('tests')
        .select('id, title')
        .not('ai_goal', 'is', null)
        .order('title');

      // Получаем пользователей с рекомендациями
      const { data: usersData } = await supabase
        .from('ai_recommendations')
        .select(`
          profiles (
            user_id,
            full_name,
            login_username
          )
        `);

      setTests(testsData || []);
      
      // Убираем дубликаты пользователей
      const uniqueUsers = Array.from(
        new Map(usersData?.map(item => [
          item.profiles.user_id,
          item.profiles
        ])).values()
      );
      setUsers(uniqueUsers || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const calculateStats = (data: AIRecommendation[]) => {
    const uniqueUsers = new Set(data.map(r => r.user_id)).size;
    const uniqueTests = new Set(data.map(r => r.test_id)).size;
    const avgScore = data.length > 0 
      ? data.reduce((sum, r) => sum + r.test_results.percentage, 0) / data.length 
      : 0;

    setStats({
      totalRecommendations: data.length,
      uniqueUsers,
      testsWithAI: uniqueTests,
      avgScore: Math.round(avgScore)
    });
  };

  const applyFilters = async () => {
    try {
      let query = supabase
        .from('ai_recommendations')
        .select(`
          *,
          test_results (
            score,
            percentage,
            completed_at
          ),
          tests (
            title,
            description
          ),
          profiles (
            full_name,
            login_username
          )
        `);

      if (selectedTest !== 'all') {
        query = query.eq('test_id', selectedTest);
      }

      if (selectedUser !== 'all') {
        query = query.eq('user_id', selectedUser);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      let filteredData = data || [];

      // Применяем текстовый поиск
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item =>
          item.profiles.full_name.toLowerCase().includes(term) ||
          item.tests.title.toLowerCase().includes(term) ||
          item.ai_goal.toLowerCase().includes(term) ||
          item.recommendations.toLowerCase().includes(term)
        );
      }

      setRecommendations(filteredData);
      calculateStats(filteredData);
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center">
          <Sparkles className="w-6 h-6 text-primary mr-2" />
          ИИ Рекомендации
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего рекомендаций</p>
                <p className="text-2xl font-bold">{stats.totalRecommendations}</p>
              </div>
              <Sparkles className="w-8 h-8 text-primary opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Пользователей</p>
                <p className="text-2xl font-bold">{stats.uniqueUsers}</p>
              </div>
              <User className="w-8 h-8 text-blue-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Тестов с ИИ</p>
                <p className="text-2xl font-bold">{stats.testsWithAI}</p>
              </div>
              <BookOpen className="w-8 h-8 text-green-500 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Средний результат</p>
                <p className="text-2xl font-bold">{stats.avgScore}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Поиск по пользователям, тестам или содержанию..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <Select value={selectedTest} onValueChange={setSelectedTest}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Все тесты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все тесты</SelectItem>
                {tests.map((test) => (
                  <SelectItem key={test.id} value={test.id}>
                    {test.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Все пользователи" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все пользователи</SelectItem>
                {users.map((user: any) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Рекомендации не найдены</h3>
              <p className="text-muted-foreground">
                Попробуйте изменить фильтры или создайте тест с ИИ анализом
              </p>
            </CardContent>
          </Card>
        ) : (
          recommendations.map((recommendation) => (
            <Card key={recommendation.id} className="shadow-medium">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center space-x-2 mb-2">
                      <User className="w-4 h-4 text-blue-500" />
                      <span>{recommendation.profiles.full_name}</span>
                      <Badge variant="secondary" className="text-xs">
                        @{recommendation.profiles.login_username}
                      </Badge>
                    </CardTitle>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <BookOpen className="w-3 h-3 mr-1" />
                        {recommendation.tests.title}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(recommendation.generated_at)}
                      </span>
                      <span className="flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {Math.round(recommendation.test_results.percentage)}%
                      </span>
                    </div>
                  </div>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Просмотр
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          Рекомендации ИИ для {recommendation.profiles.full_name}
                        </DialogTitle>
                        <DialogDescription>
                          {recommendation.tests.title} • {formatDate(recommendation.generated_at)}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        {/* AI Goal */}
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="text-sm font-medium mb-1">Цель анализа:</div>
                          <div className="text-sm text-muted-foreground">{recommendation.ai_goal}</div>
                        </div>

                        {/* Recommendations */}
                        <ScrollArea className="max-h-96">
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{recommendation.recommendations}</ReactMarkdown>
                          </div>
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>

              <CardContent>
                {/* AI Goal Preview */}
                <div className="mb-3 p-2 bg-muted/20 rounded text-xs">
                  <span className="font-medium">Цель: </span>
                  <span className="text-muted-foreground">
                    {recommendation.ai_goal.length > 120 
                      ? `${recommendation.ai_goal.substring(0, 120)}...`
                      : recommendation.ai_goal
                    }
                  </span>
                </div>

                {/* Recommendations Preview */}
                <div className="text-sm text-muted-foreground">
                  {recommendation.recommendations.length > 200 
                    ? `${recommendation.recommendations.substring(0, 200)}...`
                    : recommendation.recommendations
                  }
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAIRecommendations;