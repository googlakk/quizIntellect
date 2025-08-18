import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

export type Group = Tables<'groups'>;
export type GroupMember = Tables<'group_members'>;

interface GroupWithMembers extends Group {
  group_members: (GroupMember & {
    profiles: {
      full_name: string;
      login_username: string;
    };
  })[];
}

interface LeaderboardUser {
  user_id: string;
  full_name: string;
  total_score: number;
  average_percentage: number;
  total_tests_completed: number;
}

export const useGroups = () => {
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members (
            *,
            profiles!group_members_user_id_fkey (
              full_name,
              login_username
            )
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data as GroupWithMembers[] || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить группы",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getLeaderboardData = async (): Promise<LeaderboardUser[]> => {
    try {
      // Получаем всех пользователей
      const { data: usersData } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .order('full_name');

      if (!usersData) return [];

      // Получаем результаты тестов
      const { data: resultsData } = await supabase
        .from('test_results')
        .select('user_id, score, percentage');

      if (!resultsData) return [];

      // Создаем данные рейтинга
      const leaderboardData: LeaderboardUser[] = usersData.map(user => {
        const userResults = resultsData.filter(r => r.user_id === user.user_id);
        const totalScore = userResults.reduce((sum, r) => sum + r.score, 0);
        const totalPercentage = userResults.reduce((sum, r) => sum + r.percentage, 0);
        const averagePercentage = userResults.length > 0 ? totalPercentage / userResults.length : 0;

        return {
          user_id: user.user_id,
          full_name: user.full_name || 'Неизвестный пользователь',
          total_score: totalScore,
          average_percentage: averagePercentage,
          total_tests_completed: userResults.length
        };
      });

      // Фильтруем пользователей с результатами тестов и сортируем по общему баллу
      return leaderboardData
        .filter(entry => entry.total_tests_completed > 0)
        .sort((a, b) => b.total_score - a.total_score);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      return [];
    }
  };

  const generateBalancedGroups = (users: LeaderboardUser[], groupSize: number, forcePartialGroups: boolean = true) => {
    if (users.length === 0 || groupSize <= 0) return [];

    // Сортируем пользователей по общему баллу (по убыванию)
    const sortedUsers = [...users].sort((a, b) => b.total_score - a.total_score);
    
    // Определяем количество групп
    let totalGroups: number;
    let usersToDistribute: LeaderboardUser[];
    
    if (forcePartialGroups) {
      // Создаем столько групп, сколько нужно, даже если они будут неполными
      totalGroups = Math.max(1, Math.ceil(users.length / groupSize));
      usersToDistribute = sortedUsers;
    } else {
      // Создаем только полные группы
      totalGroups = Math.floor(users.length / groupSize);
      if (totalGroups === 0) return [];
      usersToDistribute = sortedUsers.slice(0, totalGroups * groupSize);
    }

    // Разделяем на уровни производительности
    const totalUsers = usersToDistribute.length;
    
    // Определяем пропорции более гибко
    const highCount = Math.floor(totalUsers * 0.3);
    const mediumCount = Math.floor(totalUsers * 0.3);
    const lowCount = totalUsers - highCount - mediumCount; // Остальные
    
    const highPerformers = usersToDistribute.slice(0, highCount);
    const mediumPerformers = usersToDistribute.slice(highCount, highCount + mediumCount);
    const lowPerformers = usersToDistribute.slice(highCount + mediumCount);

    // Создаем группы
    const groups: {
      members: (LeaderboardUser & { performance_tier: 'high' | 'medium' | 'low' })[];
    }[] = Array.from({ length: totalGroups }, () => ({ members: [] }));

    // Функция для перемешивания массива
    const shuffle = <T>(array: T[]): T[] => {
      const result = [...array];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    };

    // Перемешиваем каждый уровень для случайного распределения
    const shuffledHigh = shuffle(highPerformers);
    const shuffledMedium = shuffle(mediumPerformers);
    const shuffledLow = shuffle(lowPerformers);

    // Распределяем пользователей по группам циклически
    shuffledHigh.forEach((user, index) => {
      const groupIndex = index % totalGroups;
      groups[groupIndex].members.push({ ...user, performance_tier: 'high' });
    });

    shuffledMedium.forEach((user, index) => {
      const groupIndex = index % totalGroups;
      groups[groupIndex].members.push({ ...user, performance_tier: 'medium' });
    });

    shuffledLow.forEach((user, index) => {
      const groupIndex = index % totalGroups;
      groups[groupIndex].members.push({ ...user, performance_tier: 'low' });
    });

    return groups;
  };

  const createGroups = async (groupSize: number, groupName?: string, allowPartialGroups: boolean = true) => {
    try {
      setLoading(true);

      // Получаем данные рейтинга
      const leaderboardData = await getLeaderboardData();
      
      if (leaderboardData.length === 0) {
        toast({
          title: "Нет участников",
          description: "Нет участников с результатами тестов для создания групп",
          variant: "destructive"
        });
        return;
      }

      // Генерируем сбалансированные группы
      const balancedGroups = generateBalancedGroups(leaderboardData, groupSize, allowPartialGroups);
      
      if (balancedGroups.length === 0) {
        toast({
          title: "Ошибка",
          description: "Не удалось создать группы",
          variant: "destructive"
        });
        return;
      }

      // Деактивируем существующие группы
      console.log('Деактивируем существующие группы...');
      const { error: deactivateError } = await supabase
        .from('groups')
        .update({ is_active: false })
        .eq('is_active', true);
      
      if (deactivateError) {
        console.error('Ошибка при деактивации групп:', deactivateError);
        throw deactivateError;
      }

      console.log('Создаем новые группы...');
      // Создаем новые группы в базе данных
      for (let i = 0; i < balancedGroups.length; i++) {
        const group = balancedGroups[i];
        const groupData = {
          name: groupName ? `${groupName} ${i + 1}` : `Группа ${i + 1}`,
          description: `Автоматически созданная сбалансированная группа из ${groupSize} участников`,
          group_size: groupSize,
          created_by: (await supabase.auth.getUser()).data.user?.id
        };

        console.log(`Создаем группу ${i + 1}:`, groupData);
        
        const { data: createdGroup, error: groupError } = await supabase
          .from('groups')
          .insert(groupData)
          .select()
          .single();

        if (groupError) {
          console.error(`Ошибка при создании группы ${i + 1}:`, groupError);
          throw groupError;
        }

        console.log(`Группа ${i + 1} создана:`, createdGroup);

        // Добавляем участников в группу
        const members = group.members.map(member => ({
          group_id: createdGroup.id,
          user_id: member.user_id,
          performance_tier: member.performance_tier,
          total_score: member.total_score,
          average_percentage: member.average_percentage
        }));

        console.log(`Добавляем ${members.length} участников в группу ${i + 1}:`, members);

        const { error: membersError } = await supabase
          .from('group_members')
          .insert(members);

        if (membersError) {
          console.error(`Ошибка при добавлении участников в группу ${i + 1}:`, membersError);
          throw membersError;
        }

        console.log(`Участники добавлены в группу ${i + 1}`);
      }

      toast({
        title: "Группы созданы",
        description: `Успешно создано ${balancedGroups.length} сбалансированных групп`
      });

      await fetchGroups();
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

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Группа удалена",
        description: "Группа была успешно удалена"
      });

      await fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить группу",
        variant: "destructive"
      });
    }
  };

  const getUserGroup = async (userId: string): Promise<GroupWithMembers | null> => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          groups (
            *,
            group_members (
              *,
              profiles!group_members_user_id_fkey (
                full_name,
                login_username
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('groups.is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return data?.groups as GroupWithMembers || null;
    } catch (error) {
      console.error('Error fetching user group:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const addMemberToGroup = async (groupId: string, userId: string) => {
    try {
      // Сначала получаем данные пользователя из рейтинга
      const leaderboardData = await getLeaderboardData();
      const userData = leaderboardData.find(user => user.user_id === userId);
      
      if (!userData) {
        toast({
          title: "Ошибка",
          description: "Пользователь не найден в рейтинге",
          variant: "destructive"
        });
        return;
      }

      // Определяем уровень производительности
      const sortedUsers = leaderboardData.sort((a, b) => b.total_score - a.total_score);
      const userIndex = sortedUsers.findIndex(user => user.user_id === userId);
      const totalUsers = sortedUsers.length;
      
      let performanceTier: 'high' | 'medium' | 'low';
      if (userIndex < Math.floor(totalUsers * 0.3)) {
        performanceTier = 'high';
      } else if (userIndex < Math.floor(totalUsers * 0.6)) {
        performanceTier = 'medium';
      } else {
        performanceTier = 'low';
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          performance_tier: performanceTier,
          total_score: userData.total_score,
          average_percentage: userData.average_percentage
        });

      if (error) throw error;

      toast({
        title: "Участник добавлен",
        description: "Участник успешно добавлен в группу"
      });

      await fetchGroups();
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: "Ошибка",
          description: "Пользователь уже состоит в этой группе",
          variant: "destructive"
        });
      } else {
        console.error('Error adding member to group:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось добавить участника в группу",
          variant: "destructive"
        });
      }
    }
  };

  const removeMemberFromGroup = async (groupId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Участник удален",
        description: "Участник успешно удален из группы"
      });

      await fetchGroups();
    } catch (error) {
      console.error('Error removing member from group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить участника из группы",
        variant: "destructive"
      });
    }
  };

  const updateGroupInfo = async (groupId: string, name: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name,
          description
        })
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Группа обновлена",
        description: "Информация о группе успешно обновлена"
      });

      await fetchGroups();
    } catch (error) {
      console.error('Error updating group:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить информацию о группе",
        variant: "destructive"
      });
    }
  };

  const getAvailableUsers = async (excludeGroupId?: string): Promise<LeaderboardUser[]> => {
    try {
      const leaderboardData = await getLeaderboardData();
      
      if (!excludeGroupId) return leaderboardData;

      // Получаем список пользователей, уже состоящих в группах
      const { data: groupMembers } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .neq('group_id', excludeGroupId);

      const usedUserIds = new Set(groupMembers?.map(member => member.user_id) || []);
      
      return leaderboardData.filter(user => !usedUserIds.has(user.user_id));
    } catch (error) {
      console.error('Error getting available users:', error);
      return [];
    }
  };

  return {
    groups,
    loading,
    fetchGroups,
    createGroups,
    deleteGroup,
    getUserGroup,
    getLeaderboardData,
    addMemberToGroup,
    removeMemberFromGroup,
    updateGroupInfo,
    getAvailableUsers
  };
};