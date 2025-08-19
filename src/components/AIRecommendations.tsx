import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Sparkles, 
  Calendar, 
  BookOpen, 
  TrendingUp, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIRecommendation {
  id: string;
  test_id: string;
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
}

interface AIRecommendationsProps {
  testResultId?: string; // Если передан, показываем рекомендации только для этого результата
  showAll?: boolean; // Если true, показываем все рекомендации пользователя
}

const AIRecommendations = ({ testResultId, showAll = false }: AIRecommendationsProps) => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchRecommendations();
    }
  }, [user, testResultId, showAll]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

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
          )
        `)
        .eq('user_id', user!.id);

      // Если нужна конкретная рекомендация
      if (testResultId) {
        query = query.eq('test_result_id', testResultId);
      }

      // Сортируем по дате создания (новые сначала)
      query = query.order('created_at', { ascending: false });

      // Ограничиваем количество, если показываем все
      if (showAll) {
        query = query.limit(10);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setRecommendations(data || []);
    } catch (err) {
      console.error('Error fetching AI recommendations:', err);
      setError('Не удалось загрузить рекомендации');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(showAll ? 3 : 1)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
          <Button 
            variant="outline" 
            onClick={fetchRecommendations}
            className="mt-4"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Нет рекомендаций</h3>
          <p className="text-muted-foreground">
            Рекомендации ИИ появятся после прохождения тестов с настроенным анализом
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!testResultId && showAll && (
        <div className="text-center">
          <h2 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-primary mr-2" />
            Персональные рекомендации ИИ
          </h2>
          <p className="text-muted-foreground">
            Индивидуальные советы на основе ваших результатов тестирования
          </p>
        </div>
      )}

      <div className="space-y-4">
        {recommendations.map((recommendation) => (
          <Card key={recommendation.id} className="shadow-medium">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>{recommendation.tests.title}</span>
                  </CardTitle>
                  <CardDescription className="mt-2 flex items-center space-x-4">
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(recommendation.generated_at)}
                    </span>
                    <span className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {recommendation.test_results.score} баллов ({Math.round(recommendation.test_results.percentage)}%)
                    </span>
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>ИИ Анализ</span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {/* Цель анализа */}
              <div className="mb-4 p-3 bg-muted/30 rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">
                  Цель анализа:
                </div>
                <div className="text-sm">{recommendation.ai_goal}</div>
              </div>

              <Separator className="my-4" />

              {/* Рекомендации */}
              <ScrollArea className="max-h-96">
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-ul:text-muted-foreground prose-li:text-muted-foreground">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-foreground mb-4">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold text-foreground mb-3 mt-6">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-medium text-foreground mb-2 mt-4">{children}</h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{children}</p>
                      ),
                      ul: ({ children }) => (
                        <ul className="text-sm text-muted-foreground mb-3 pl-4 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="text-sm text-muted-foreground mb-3 pl-4 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-sm text-muted-foreground">{children}</li>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-medium text-foreground">{children}</strong>
                      )
                    }}
                  >
                    {recommendation.recommendations}
                  </ReactMarkdown>
                </div>
              </ScrollArea>

              {/* Индикатор успешной генерации */}
              <div className="flex items-center justify-center mt-4 text-xs text-muted-foreground">
                <CheckCircle className="w-3 h-3 mr-1" />
                <span>Рекомендации сгенерированы ИИ на основе ваших ответов</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showAll && recommendations.length > 0 && (
        <div className="text-center">
          <Button variant="outline" onClick={fetchRecommendations}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить рекомендации
          </Button>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;