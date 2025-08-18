import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGroups } from '@/hooks/useGroups';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Award, Trophy, Medal, Target } from 'lucide-react';

interface GroupMember {
  id: string;
  user_id: string;
  performance_tier: 'high' | 'medium' | 'low';
  total_score: number;
  average_percentage: number;
  profiles: {
    full_name: string;
    login_username: string;
  };
}

interface UserGroup {
  id: string;
  name: string;
  description?: string;
  group_members: GroupMember[];
}

const Groups = () => {
  const { user } = useAuth();
  const { getUserGroup } = useGroups();
  const [userGroup, setUserGroup] = useState<UserGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchUserGroup();
    }
  }, [user]);

  const fetchUserGroup = async () => {
    try {
      setLoading(true);
      if (user?.id) {
        console.log('Fetching group for user:', user.id);
        
        // Найдем активную группу пользователя
        const { data: memberData, error: memberError } = await supabase
          .from('group_members')
          .select(`
            group_id,
            groups!inner (
              id,
              is_active
            )
          `)
          .eq('user_id', user.id)
          .eq('groups.is_active', true)
          .limit(1);

        if (memberError || !memberData || memberData.length === 0) {
          console.log('User not in any active group:', memberError);
          setUserGroup(null);
          return;
        }

        console.log('User member data:', memberData);
        const groupId = memberData[0].group_id;

        // Теперь получим полную информацию о группе
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select(`
            *,
            group_members (
              *,
              profiles (
                full_name,
                login_username
              )
            )
          `)
          .eq('id', groupId)
          .eq('is_active', true)
          .single();

        if (groupError) {
          console.error('Error fetching group:', groupError);
          setUserGroup(null);
          return;
        }

        console.log('Group data:', groupData);
        setUserGroup(groupData);
      }
    } catch (error) {
      console.error('Error fetching user group:', error);
      setUserGroup(null);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceTierInfo = (tier: string) => {
    switch (tier) {
      case 'high':
        return {
          label: 'Высокий уровень',
          icon: <Trophy className="w-4 h-4" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          badgeVariant: 'default' as const
        };
      case 'medium':
        return {
          label: 'Средний уровень',
          icon: <Medal className="w-4 h-4" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          badgeVariant: 'secondary' as const
        };
      case 'low':
        return {
          label: 'Развивающийся уровень',
          icon: <Target className="w-4 h-4" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          badgeVariant: 'outline' as const
        };
      default:
        return {
          label: 'Не определен',
          icon: <Target className="w-4 h-4" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          badgeVariant: 'outline' as const
        };
    }
  };

  const getCurrentUserMember = (): GroupMember | null => {
    if (!userGroup || !user?.id) return null;
    return userGroup.group_members.find((member) => member.user_id === user.id) || null;
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
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-48"></div>
                    <div className="h-3 bg-muted rounded w-32"></div>
                  </div>
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
          <Users className="w-10 h-10 text-primary mr-3" />
          Моя группа
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Информация о вашей команде и совместной работе
        </p>
      </div>

      {userGroup ? (
        <div className="space-y-6">
          {/* Group Info Card */}
          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-6 h-6 text-primary" />
                <span>{userGroup.name}</span>
              </CardTitle>
              <CardDescription>
                Участников в группе: {userGroup.group_members?.length || 0}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Group Members */}
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Участники вашей группы</CardTitle>
              <CardDescription>
                Список всех участников команды
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {userGroup.group_members && userGroup.group_members.length > 0 ? (
                  userGroup.group_members
                    .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
                    .map((member, index) => {
                      const tierInfo = getPerformanceTierInfo(member.performance_tier);
                      const isCurrentUser = member.user_id === user?.id;
                      
                      return (
                        <div 
                          key={member.id}
                          className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-medium ${
                            isCurrentUser ? 'bg-primary/5 border-primary/20' : 'hover:bg-accent/5'
                          }`}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full text-sm font-bold">
                              #{index + 1}
                            </div>
                            
                            <Avatar className="w-12 h-12">
                              <AvatarFallback className="bg-gradient-primary text-white font-bold">
                                {member.profiles?.full_name?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">
                                  {member.profiles?.full_name || 'Неизвестный пользователь'}
                                  {isCurrentUser && (
                                    <span className="text-xs text-primary ml-2">(Вы)</span>
                                  )}
                                </h3>
                                {member.performance_tier && (
                                  <Badge variant={tierInfo.badgeVariant} className="text-xs">
                                    {tierInfo.label}
                                  </Badge>
                                )}
                              </div>
                              {member.profiles?.login_username && (
                                <p className="text-xs text-muted-foreground">
                                  @{member.profiles.login_username}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {member.total_score || 0}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(member.average_percentage || 0)}% средний
                            </div>
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    В группе пока нет участников
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Вы не состоите в группе</h3>
          <p className="text-muted-foreground">
            Группы создаются администратором на основе результатов тестирования. 
            Пройдите несколько тестов, чтобы быть включенным в следующее распределение.
          </p>
        </div>
      )}
    </div>
  );
};

export default Groups;