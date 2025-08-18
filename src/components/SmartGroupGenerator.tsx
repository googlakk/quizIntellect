import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  Brain, 
  Target, 
  BarChart3, 
  Shuffle, 
  Settings,
  TrendingUp,
  Award,
  CheckCircle2
} from 'lucide-react';

interface AssessmentResult {
  user_id: string;
  test_id: string;
  test_title: string;
  category_name: string;
  score: number;
  max_score: number;
  percentage: number;
  competency_scores: Record<string, number>; // Баллы по каждой компетенции
}

interface UserCompetencyProfile {
  user_id: string;
  full_name: string;
  competencies: Record<string, {
    score: number;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    tests_count: number;
  }>;
  overall_score: number;
  balance_score: number; // Насколько сбалансированы навыки
}

interface GroupDistributionConfig {
  groupSize: number;
  balanceStrategy: 'mixed_skills' | 'balanced_teams' | 'complementary' | 'similar_level';
  prioritizeCompetencies: string[];
  allowPartialGroups: boolean;
  diversityWeight: number; // 0-100, как важно разнообразие навыков
  skillGapTolerance: number; // 0-100, допустимая разница в уровнях
}

const SmartGroupGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'config' | 'analysis' | 'preview' | 'create'>('config');
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResult[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserCompetencyProfile[]>([]);
  const [availableCompetencies, setAvailableCompetencies] = useState<string[]>([]);
  const [generatedGroups, setGeneratedGroups] = useState<UserCompetencyProfile[][]>([]);
  
  const [config, setConfig] = useState<GroupDistributionConfig>({
    groupSize: 4,
    balanceStrategy: 'balanced_teams',
    prioritizeCompetencies: [],
    allowPartialGroups: true,
    diversityWeight: 70,
    skillGapTolerance: 30
  });

  const [groupName, setGroupName] = useState('Умная группа');

  useEffect(() => {
    loadAssessmentData();
  }, []);

  const loadAssessmentData = async () => {
    try {
      setLoading(true);
      
      // Получаем результаты оценочных тестов
      const { data: results, error } = await supabase
        .from('test_results')
        .select(`
          user_id,
          score,
          percentage,
          tests!inner (
            id,
            title,
            test_type,
            categories!inner (
              name
            ),
            questions (
              id,
              question_text,
              points
            )
          ),
          user_answers (
            question_id,
            selected_option_ids,
            points_earned,
            questions!inner (
              question_text
            )
          )
        `)
        .eq('tests.test_type', 'assessment');

      if (error) throw error;

      // Получаем профили пользователей
      const userIds = [...new Set(results?.map(r => r.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Обрабатываем результаты для создания профилей компетенций
      const processedResults = await processAssessmentResults(results || []);
      setAssessmentResults(processedResults);
      
      // Создаем профили пользователей
      const userProfiles = createUserCompetencyProfiles(processedResults, profiles || []);
      setUserProfiles(userProfiles);
      
      // Извлекаем доступные компетенции
      const competencies = extractAvailableCompetencies(userProfiles);
      setAvailableCompetencies(competencies);
      
    } catch (error) {
      console.error('Error loading assessment data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные оценочных тестов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const processAssessmentResults = async (rawResults: any[]): Promise<AssessmentResult[]> => {
    return rawResults.map(result => {
      // Группируем ответы по вопросам для анализа компетенций
      const competencyScores: Record<string, number> = {};
      
      if (result.user_answers && result.user_answers.length > 0) {
        result.user_answers.forEach((answer: any) => {
          const questionText = answer.questions?.question_text || '';
          const competency = extractCompetencyFromQuestion(questionText);
          if (competency) {
            if (!competencyScores[competency]) {
              competencyScores[competency] = 0;
            }
            competencyScores[competency] += answer.points_earned || 0;
          }
        });
      }

      return {
        user_id: result.user_id,
        test_id: result.tests.id,
        test_title: result.tests.title,
        category_name: result.tests.categories.name,
        score: result.score,
        max_score: result.tests.questions?.reduce((sum: number, q: any) => sum + q.points, 0) || 0,
        percentage: result.percentage,
        competency_scores: competencyScores
      };
    });
  };

  const extractCompetencyFromQuestion = (questionText: string): string | null => {
    // Анализируем текст вопроса для определения компетенции
    const competencyKeywords: Record<string, string[]> = {
      'Цифровые навыки': ['компьютер', 'программ', 'интернет', 'цифров', 'технолог'],
      'Педагогические методы': ['обучение', 'преподавание', 'методика', 'студент', 'урок'],
      'Оценка и контроль': ['оценка', 'тест', 'контроль', 'проверка', 'анализ'],
      'Коммуникация': ['общение', 'презентация', 'выступление', 'коммуникация'],
      'Планирование': ['планирование', 'организация', 'структура', 'время'],
      'Творческий подход': ['творчество', 'креатив', 'инновация', 'новый']
    };

    const lowerText = questionText.toLowerCase();
    
    for (const [competency, keywords] of Object.entries(competencyKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return competency;
      }
    }
    
    return 'Общие навыки'; // Дефолтная компетенция
  };

  const createUserCompetencyProfiles = (results: AssessmentResult[], profiles: any[]): UserCompetencyProfile[] => {
    const userMap = new Map<string, UserCompetencyProfile>();

    results.forEach(result => {
      if (!userMap.has(result.user_id)) {
        const userProfile = profiles.find(p => p.user_id === result.user_id);
        userMap.set(result.user_id, {
          user_id: result.user_id,
          full_name: userProfile?.full_name || 'Неизвестный пользователь',
          competencies: {},
          overall_score: 0,
          balance_score: 0
        });
      }

      const profile = userMap.get(result.user_id)!;
      
      // Добавляем компетенции из этого теста
      Object.entries(result.competency_scores).forEach(([competency, score]) => {
        if (!profile.competencies[competency]) {
          profile.competencies[competency] = {
            score: 0,
            level: 'beginner',
            tests_count: 0
          };
        }
        
        profile.competencies[competency].score += score;
        profile.competencies[competency].tests_count += 1;
      });
    });

    // Финализируем профили
    return Array.from(userMap.values()).map(profile => {
      // Рассчитываем уровни компетенций
      Object.entries(profile.competencies).forEach(([competency, data]) => {
        const avgScore = data.score / data.tests_count;
        data.level = getCompetencyLevel(avgScore);
      });

      // Рассчитываем общий балл
      const competencyScores = Object.values(profile.competencies).map(c => c.score);
      profile.overall_score = competencyScores.reduce((sum, score) => sum + score, 0);

      // Рассчитываем балл сбалансированности (насколько равномерно развиты навыки)
      if (competencyScores.length > 1) {
        const avg = profile.overall_score / competencyScores.length;
        const variance = competencyScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / competencyScores.length;
        profile.balance_score = Math.max(0, 100 - Math.sqrt(variance));
      } else {
        profile.balance_score = 50; // Средний балл для одной компетенции
      }

      return profile;
    });
  };

  const getCompetencyLevel = (score: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' => {
    if (score >= 80) return 'expert';
    if (score >= 60) return 'advanced';
    if (score >= 40) return 'intermediate';
    return 'beginner';
  };

  const extractAvailableCompetencies = (profiles: UserCompetencyProfile[]): string[] => {
    const competencies = new Set<string>();
    profiles.forEach(profile => {
      Object.keys(profile.competencies).forEach(comp => competencies.add(comp));
    });
    return Array.from(competencies).sort();
  };

  const generateSmartGroups = () => {
    if (userProfiles.length === 0) {
      toast({
        title: "Нет данных",
        description: "Нет пользователей с результатами оценочных тестов",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      let groups: UserCompetencyProfile[][] = [];
      
      switch (config.balanceStrategy) {
        case 'mixed_skills':
          groups = generateMixedSkillsGroups();
          break;
        case 'balanced_teams':
          groups = generateBalancedTeams();
          break;
        case 'complementary':
          groups = generateComplementaryGroups();
          break;
        case 'similar_level':
          groups = generateSimilarLevelGroups();
          break;
      }
      
      setGeneratedGroups(groups);
      setStep('preview');
      
    } catch (error) {
      console.error('Error generating groups:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать группы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateBalancedTeams = (): UserCompetencyProfile[][] => {
    // Сортируем пользователей по общему баллу
    const sortedUsers = [...userProfiles].sort((a, b) => b.overall_score - a.overall_score);
    
    const numGroups = Math.ceil(sortedUsers.length / config.groupSize);
    const groups: UserCompetencyProfile[][] = Array.from({ length: numGroups }, () => []);
    
    // Распределяем пользователей "змейкой" для равномерного распределения
    sortedUsers.forEach((user, index) => {
      const groupIndex = Math.floor(index / config.groupSize) % 2 === 0 
        ? index % numGroups 
        : numGroups - 1 - (index % numGroups);
      
      if (groups[groupIndex].length < config.groupSize || config.allowPartialGroups) {
        groups[groupIndex].push(user);
      }
    });
    
    return groups.filter(group => group.length > 0);
  };

  const generateMixedSkillsGroups = (): UserCompetencyProfile[][] => {
    // Группируем пользователей по доминирующим компетенциям
    const competencyGroups: Record<string, UserCompetencyProfile[]> = {};
    
    userProfiles.forEach(user => {
      const dominantCompetency = Object.entries(user.competencies)
        .sort(([,a], [,b]) => b.score - a.score)[0]?.[0] || 'Общие навыки';
      
      if (!competencyGroups[dominantCompetency]) {
        competencyGroups[dominantCompetency] = [];
      }
      competencyGroups[dominantCompetency].push(user);
    });
    
    // Создаем смешанные группы
    const groups: UserCompetencyProfile[][] = [];
    const numGroups = Math.ceil(userProfiles.length / config.groupSize);
    
    for (let i = 0; i < numGroups; i++) {
      groups.push([]);
    }
    
    // Распределяем по одному представителю каждой компетенции в каждую группу
    Object.values(competencyGroups).forEach(competencyUsers => {
      competencyUsers.forEach((user, index) => {
        const groupIndex = index % numGroups;
        if (groups[groupIndex].length < config.groupSize || config.allowPartialGroups) {
          groups[groupIndex].push(user);
        }
      });
    });
    
    return groups.filter(group => group.length > 0);
  };

  const generateComplementaryGroups = (): UserCompetencyProfile[][] => {
    // Создаем группы с взаимодополняющими навыками
    const groups: UserCompetencyProfile[][] = [];
    const remainingUsers = [...userProfiles];
    
    while (remainingUsers.length >= (config.allowPartialGroups ? 1 : config.groupSize)) {
      const group: UserCompetencyProfile[] = [];
      
      // Выбираем первого пользователя случайно
      const firstUserIndex = Math.floor(Math.random() * remainingUsers.length);
      const firstUser = remainingUsers.splice(firstUserIndex, 1)[0];
      group.push(firstUser);
      
      // Добавляем пользователей с дополняющими навыками
      while (group.length < config.groupSize && remainingUsers.length > 0) {
        const bestMatch = findBestComplement(group, remainingUsers);
        if (bestMatch !== -1) {
          group.push(remainingUsers.splice(bestMatch, 1)[0]);
        } else {
          // Если не найдено хорошего дополнения, берем случайного
          const randomIndex = Math.floor(Math.random() * remainingUsers.length);
          group.push(remainingUsers.splice(randomIndex, 1)[0]);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  };

  const findBestComplement = (currentGroup: UserCompetencyProfile[], candidates: UserCompetencyProfile[]): number => {
    let bestScore = -1;
    let bestIndex = -1;
    
    // Анализируем текущие компетенции группы
    const groupCompetencies: Record<string, number> = {};
    currentGroup.forEach(user => {
      Object.entries(user.competencies).forEach(([comp, data]) => {
        groupCompetencies[comp] = (groupCompetencies[comp] || 0) + data.score;
      });
    });
    
    candidates.forEach((candidate, index) => {
      let complementScore = 0;
      
      // Считаем, насколько кандидат дополняет группу
      Object.entries(candidate.competencies).forEach(([comp, data]) => {
        const groupStrength = groupCompetencies[comp] || 0;
        // Чем слабее компетенция в группе, тем ценнее кандидат с этой компетенцией
        complementScore += data.score * (100 - groupStrength) / 100;
      });
      
      if (complementScore > bestScore) {
        bestScore = complementScore;
        bestIndex = index;
      }
    });
    
    return bestIndex;
  };

  const generateSimilarLevelGroups = (): UserCompetencyProfile[][] => {
    // Группируем пользователей с похожим общим уровнем
    const sortedUsers = [...userProfiles].sort((a, b) => a.overall_score - b.overall_score);
    const groups: UserCompetencyProfile[][] = [];
    
    for (let i = 0; i < sortedUsers.length; i += config.groupSize) {
      const group = sortedUsers.slice(i, i + config.groupSize);
      if (group.length >= config.groupSize || (config.allowPartialGroups && group.length > 0)) {
        groups.push(group);
      }
    }
    
    return groups;
  };

  const createGroupsInDatabase = async () => {
    try {
      setLoading(true);
      
      // Деактивируем существующие группы
      await supabase
        .from('groups')
        .update({ is_active: false })
        .eq('is_active', true);
      
      // Создаем новые группы
      for (let i = 0; i < generatedGroups.length; i++) {
        const group = generatedGroups[i];
        
        const { data: createdGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: `${groupName} ${i + 1}`,
            description: `Умная группа, созданная с учетом компетенций (стратегия: ${config.balanceStrategy})`,
            group_size: config.groupSize
          })
          .select()
          .single();
        
        if (groupError) throw groupError;
        
        // Добавляем участников
        const members = group.map(user => ({
          group_id: createdGroup.id,
          user_id: user.user_id,
          performance_tier: getOverallPerformanceTier(user),
          total_score: user.overall_score,
          average_percentage: calculateAveragePercentage(user)
        }));
        
        const { error: membersError } = await supabase
          .from('group_members')
          .insert(members);
        
        if (membersError) throw membersError;
      }
      
      toast({
        title: "Группы созданы",
        description: `Успешно создано ${generatedGroups.length} умных групп`
      });
      
      setStep('create');
      
    } catch (error) {
      console.error('Error creating groups:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать группы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getOverallPerformanceTier = (user: UserCompetencyProfile): 'high' | 'medium' | 'low' => {
    const avgScore = user.overall_score / Math.max(1, Object.keys(user.competencies).length);
    if (avgScore >= 70) return 'high';
    if (avgScore >= 40) return 'medium';
    return 'low';
  };

  const calculateAveragePercentage = (user: UserCompetencyProfile): number => {
    const competencyValues = Object.values(user.competencies);
    if (competencyValues.length === 0) return 0;
    
    const totalScore = competencyValues.reduce((sum, comp) => sum + comp.score, 0);
    return totalScore / competencyValues.length;
  };

  const getCompetencyColor = (level: string) => {
    switch (level) {
      case 'expert': return 'text-green-600 bg-green-50';
      case 'advanced': return 'text-blue-600 bg-blue-50';
      case 'intermediate': return 'text-yellow-600 bg-yellow-50';
      case 'beginner': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderConfigurationStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Настройки распределения</span>
          </CardTitle>
          <CardDescription>
            Настройте параметры для умного создания групп
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="groupSize">Размер группы</Label>
              <Input
                id="groupSize"
                type="number"
                min="2"
                max="10"
                value={config.groupSize}
                onChange={(e) => setConfig({...config, groupSize: parseInt(e.target.value) || 4})}
              />
            </div>
            
            <div>
              <Label htmlFor="groupName">Название групп</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Умная группа"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="strategy">Стратегия распределения</Label>
            <Select 
              value={config.balanceStrategy} 
              onValueChange={(value: any) => setConfig({...config, balanceStrategy: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="balanced_teams">Сбалансированные команды</SelectItem>
                <SelectItem value="mixed_skills">Смешанные навыки</SelectItem>
                <SelectItem value="complementary">Взаимодополняющие</SelectItem>
                <SelectItem value="similar_level">Похожий уровень</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Приоритетные компетенции</Label>
            <div className="grid grid-cols-2 gap-2">
              {availableCompetencies.map(competency => (
                <div key={competency} className="flex items-center space-x-2">
                  <Checkbox
                    checked={config.prioritizeCompetencies.includes(competency)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfig({
                          ...config,
                          prioritizeCompetencies: [...config.prioritizeCompetencies, competency]
                        });
                      } else {
                        setConfig({
                          ...config,
                          prioritizeCompetencies: config.prioritizeCompetencies.filter(c => c !== competency)
                        });
                      }
                    }}
                  />
                  <Label className="text-sm">{competency}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Важность разнообразия навыков: {config.diversityWeight}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.diversityWeight}
                onChange={(e) => setConfig({...config, diversityWeight: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <Label>Допустимая разница в уровнях: {config.skillGapTolerance}%</Label>
              <input
                type="range"
                min="0"
                max="100"
                value={config.skillGapTolerance}
                onChange={(e) => setConfig({...config, skillGapTolerance: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              checked={config.allowPartialGroups}
              onCheckedChange={(checked) => setConfig({...config, allowPartialGroups: !!checked})}
            />
            <Label>Разрешить неполные группы</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('analysis')}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Анализ данных
        </Button>
        <Button onClick={generateSmartGroups} disabled={loading || userProfiles.length === 0}>
          <Shuffle className="w-4 h-4 mr-2" />
          Сгенерировать группы
        </Button>
      </div>
    </div>
  );

  const renderAnalysisStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Анализ данных</span>
          </CardTitle>
          <CardDescription>
            Статистика по пользователям и их компетенциям
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{userProfiles.length}</div>
                <div className="text-sm text-muted-foreground">Пользователей</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{availableCompetencies.length}</div>
                <div className="text-sm text-muted-foreground">Компетенций</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.ceil(userProfiles.length / config.groupSize)}
                </div>
                <div className="text-sm text-muted-foreground">Групп будет создано</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Распределение по компетенциям</h4>
              <div className="space-y-2">
                {availableCompetencies.map(competency => {
                  const usersWithCompetency = userProfiles.filter(user => 
                    user.competencies[competency]
                  ).length;
                  const percentage = (usersWithCompetency / userProfiles.length) * 100;
                  
                  return (
                    <div key={competency} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{competency}</span>
                        <span>{usersWithCompetency} пользователей ({Math.round(percentage)}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('config')}>
          Назад к настройкам
        </Button>
        <Button onClick={generateSmartGroups} disabled={loading}>
          <Shuffle className="w-4 h-4 mr-2" />
          Сгенерировать группы
        </Button>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Предварительный просмотр групп</span>
          </CardTitle>
          <CardDescription>
            Проверьте распределение перед созданием
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {generatedGroups.map((group, index) => (
              <Card key={index} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {groupName} {index + 1}
                  </CardTitle>
                  <CardDescription>
                    {group.length} участников
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {group.map((user, userIndex) => (
                      <div key={userIndex} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <div className="font-medium">{user.full_name || `Пользователь ${user.user_id}`}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(user.competencies).map(([comp, data]) => (
                              <Badge 
                                key={comp} 
                                variant="outline" 
                                className={`text-xs ${getCompetencyColor(data.level)}`}
                              >
                                {comp}: {data.level}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary">{Math.round(user.overall_score)}</div>
                          <div className="text-xs text-muted-foreground">общий балл</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('config')}>
          Изменить настройки
        </Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={generateSmartGroups}>
            <Shuffle className="w-4 h-4 mr-2" />
            Перегенерировать
          </Button>
          <Button onClick={createGroupsInDatabase} disabled={loading}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Создать группы
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Группы успешно созданы!</h2>
          <p className="text-muted-foreground mt-2">
            Создано {generatedGroups.length} сбалансированных групп с учетом компетенций пользователей
          </p>
        </div>
      </div>
      
      <Button onClick={() => setStep('config')} variant="outline">
        Создать новые группы
      </Button>
    </div>
  );

  if (loading && step === 'config') {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Загрузка данных оценочных тестов...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center space-x-3">
          <Brain className="w-8 h-8 text-primary" />
          <span>Умное распределение групп</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Создание сбалансированных команд на основе результатов оценочных тестов
        </p>
      </div>

      <Tabs value={step} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">Настройка</TabsTrigger>
          <TabsTrigger value="analysis">Анализ</TabsTrigger>
          <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
          <TabsTrigger value="create">Создание</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          {renderConfigurationStep()}
        </TabsContent>

        <TabsContent value="analysis">
          {renderAnalysisStep()}
        </TabsContent>

        <TabsContent value="preview">
          {renderPreviewStep()}
        </TabsContent>

        <TabsContent value="create">
          {renderSuccessStep()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartGroupGenerator;