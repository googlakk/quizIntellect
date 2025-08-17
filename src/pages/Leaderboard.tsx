import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Target, TrendingUp } from 'lucide-react';

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  subject: string;
  total_score: number;
  tests_completed: number;
  average_percentage: number;
  test_results: { [subject: string]: number };
}

interface Subject {
  id: string;
  name: string;
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardData();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'test_results'
        },
        () => {
          fetchLeaderboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      setSubjects(subjectsData || []);

      // Fetch all test results with user profiles and test data
      const { data: resultsData } = await supabase
        .from('test_results')
        .select(`
          *,
          profiles(full_name, subject),
          tests(
            title,
            subjects(name)
          )
        `);

      if (!resultsData) return;

      // Group results by user and calculate aggregated data
      const userResults = new Map<string, LeaderboardEntry>();

      resultsData.forEach((result: any) => {
        const userId = result.user_id;
        const subjectName = result.tests?.subjects?.name || 'Неизвестный предмет';
        
        if (!userResults.has(userId)) {
          userResults.set(userId, {
            user_id: userId,
            full_name: result.profiles?.full_name || 'Неизвестный пользователь',
            subject: result.profiles?.subject || 'Не указан',
            total_score: 0,
            tests_completed: 0,
            average_percentage: 0,
            test_results: {}
          });
        }

        const entry = userResults.get(userId)!;
        entry.total_score += result.score;
        entry.tests_completed += 1;
        
        // Store the best result for each subject
        if (!entry.test_results[subjectName] || entry.test_results[subjectName] < result.score) {
          entry.test_results[subjectName] = result.score;
        }
      });

      // Calculate average percentages and sort by total score
      const leaderboardData = Array.from(userResults.values()).map(entry => {
        const totalPercentage = resultsData
          .filter(r => r.user_id === entry.user_id)
          .reduce((sum, r) => sum + r.percentage, 0);
        
        entry.average_percentage = entry.tests_completed > 0 
          ? totalPercentage / entry.tests_completed 
          : 0;
        
        return entry;
      }).sort((a, b) => b.total_score - a.total_score);

      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-warning" />;
      case 2:
        return <Medal className="w-6 h-6 text-muted-foreground" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getRankBadge = (position: number) => {
    if (position === 1) return "default";
    if (position === 2) return "secondary";
    if (position === 3) return "destructive";
    return "outline";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-muted rounded w-96 mx-auto"></div>
          </div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-48"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-16"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-warning mr-3" />
          Таблица лидеров
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Рейтинг участников по результатам тестирования в режиме реального времени
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего участников</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{leaderboard.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активных предметов</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{subjects.length}</div>
          </CardContent>
        </Card>

        <Card className="shadow-medium">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Лидер</CardTitle>
            <Trophy className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-warning">
              {leaderboard[0]?.full_name || 'Пока нет'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard Table */}
      <Card className="shadow-strong">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-primary" />
            Общий рейтинг
          </CardTitle>
          <CardDescription>
            Участники отсортированы по общему количеству набранных баллов
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div 
                  key={entry.user_id} 
                  className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-medium hover:shadow-medium ${
                    index < 3 ? 'bg-gradient-subtle' : 'hover:bg-accent/5'
                  }`}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center justify-center w-12">
                      {getRankIcon(index + 1)}
                    </div>
                    
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-primary text-white font-bold">
                        {entry.full_name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-lg">{entry.full_name}</h3>
                        <Badge variant={getRankBadge(index + 1)}>
                          #{index + 1}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        Тестов пройдено: {entry.tests_completed} | 
                        Средний балл: {Math.round(entry.average_percentage)}%
                      </p>
                    </div>
                  </div>

                  {/* Subject scores */}
                  <div className="hidden lg:flex items-center space-x-2 mr-4">
                    {subjects.slice(0, 4).map(subject => (
                      <div key={subject.id} className="text-center min-w-[60px]">
                        <div className="text-xs text-muted-foreground mb-1 truncate">
                          {subject.name}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {entry.test_results[subject.name] || '-'}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {entry.total_score}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      баллов
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg text-muted-foreground">Пока нет результатов</p>
              <p className="text-sm text-muted-foreground mt-2">
                Станьте первым, кто пройдет тест!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Breakdown */}
      {subjects.length > 0 && (
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle>Результаты по предметам</CardTitle>
            <CardDescription>
              Детальная разбивка результатов по каждому предмету
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Участник</th>
                    {subjects.map(subject => (
                      <th key={subject.id} className="text-center py-2 font-medium min-w-[100px]">
                        {subject.name}
                      </th>
                    ))}
                    <th className="text-center py-2 font-medium">Общий балл</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((entry, index) => (
                    <tr key={entry.user_id} className="border-b hover:bg-accent/5">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">#{index + 1}</span>
                          <span className="truncate">{entry.full_name}</span>
                        </div>
                      </td>
                      {subjects.map(subject => (
                        <td key={subject.id} className="text-center py-3">
                          <Badge 
                            variant={entry.test_results[subject.name] ? "default" : "outline"}
                            className="text-xs"
                          >
                            {entry.test_results[subject.name] || '-'}
                          </Badge>
                        </td>
                      ))}
                      <td className="text-center py-3">
                        <span className="font-bold text-primary">{entry.total_score}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Leaderboard;