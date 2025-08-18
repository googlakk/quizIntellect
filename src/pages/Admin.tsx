import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import ImportTest from '@/components/ImportTest';
import { useGroups } from '@/hooks/useGroups';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  BarChart3,
  Users,
  BookOpen,
  Settings,
  UsersRound,
  Shuffle
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

interface Category {
  id: string;
  name: string;
  description: string | null;
}

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

interface Group {
  id: string;
  name: string;
  description?: string;
  group_size: number;
  is_active: boolean;
  group_members: GroupMember[];
}

const Admin = () => {
  const { user } = useAuth();
  const { 
    groups, 
    loading: groupsLoading, 
    createGroups, 
    deleteGroup, 
    getLeaderboardData,
    addMemberToGroup,
    removeMemberFromGroup,
    updateGroupInfo,
    getAvailableUsers
  } = useGroups();
  const [tests, setTests] = useState<Test[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [createTestOpen, setCreateTestOpen] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroupOpen, setEditGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [groupSize, setGroupSize] = useState<number>(7);
  const [groupName, setGroupName] = useState<string>('Команда');
  const [availableUsers, setAvailableUsers] = useState<Array<{
    user_id: string;
    full_name: string;
    total_score: number;
    average_percentage: number;
  }>>([]);

  useEffect(() => {
    fetchTests();
    fetchCategories();
  }, []);

  const fetchTests = async () => {
    try {
      const { data } = await supabase
        .from('tests')
        .select(`
          *,
          categories:category_id (id, name),
          questions (id)
        `)
        .order('created_at', { ascending: false });

      if (data) {
        setTests(data as Test[]);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (formData: FormData) => {
    try {
      const testData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || null,
        category_id: formData.get('category_id') as string,
        time_limit_minutes: formData.get('time_limit') ? parseInt(formData.get('time_limit') as string) : null,
        max_score: 0, // Will be calculated based on questions
        created_by: user?.id,
        is_active: false // Start as inactive until questions are added
      };

      const { error } = await supabase
        .from('tests')
        .insert(testData);

      if (error) throw error;

      toast({
        title: "Тест создан",
        description: "Тест успешно создан. Теперь добавьте вопросы."
      });

      setCreateTestOpen(false);
      fetchTests();
    } catch (error) {
      console.error('Error creating test:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать тест",
        variant: "destructive"
      });
    }
  };

  const handleCreateCategory = async (formData: FormData) => {
    try {
      const categoryData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || null
      };

      const { error } = await supabase
        .from('categories')
        .insert(categoryData);

      if (error) throw error;

      toast({
        title: "Раздел создан",
        description: "Раздел успешно добавлен"
      });

      setCreateCategoryOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать раздел",
        variant: "destructive"
      });
    }
  };

  const handleEditCategory = async (formData: FormData) => {
    if (!editingCategory) return;

    try {
      const categoryData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || null
      };

      const { error } = await supabase
        .from('categories')
        .update(categoryData)
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast({
        title: "Раздел обновлен",
        description: "Раздел успешно изменен"
      });

      setEditCategoryOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить раздел",
        variant: "destructive"
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить раздел "${categoryName}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({
        title: "Раздел удален",
        description: "Раздел был успешно удален"
      });

      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить раздел",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryOpen(true);
  };

  const handleCreateGroups = async () => {
    if (groupSize < 2) {
      toast({
        title: "Ошибка",
        description: "Размер группы должен быть минимум 2 участника",
        variant: "destructive"
      });
      return;
    }

    const leaderboardData = await getLeaderboardData();
    if (leaderboardData.length < groupSize) {
      toast({
        title: "Недостаточно участников",
        description: `Для создания групп нужно минимум ${groupSize} участников с результатами тестов`,
        variant: "destructive"
      });
      return;
    }

    await createGroups(groupSize, groupName);
    setCreateGroupOpen(false);
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить группу "${groupName}"? Это действие нельзя отменить.`)) {
      return;
    }
    await deleteGroup(groupId);
  };

  const handleEditGroup = async (group: Group) => {
    setEditingGroup(group);
    const users = await getAvailableUsers(group.id);
    setAvailableUsers(users);
    setEditGroupOpen(true);
  };

  const handleUpdateGroup = async (formData: FormData) => {
    if (!editingGroup) return;

    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    await updateGroupInfo(editingGroup.id, name, description);
    setEditGroupOpen(false);
    setEditingGroup(null);
  };

  const handleAddMember = async (groupId: string, userId: string) => {
    await addMemberToGroup(groupId, userId);
    // Обновляем список доступных пользователей
    const users = await getAvailableUsers(groupId);
    setAvailableUsers(users);
  };

  const handleRemoveMember = async (groupId: string, userId: string, userName: string) => {
    if (!confirm(`Удалить ${userName} из группы?`)) return;
    
    await removeMemberFromGroup(groupId, userId);
    // Обновляем список доступных пользователей
    const users = await getAvailableUsers(groupId);
    setAvailableUsers(users);
  };

  const toggleTestStatus = async (testId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('tests')
        .update({ is_active: !currentStatus })
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Статус изменен",
        description: `Тест ${!currentStatus ? 'активирован' : 'деактивирован'}`
      });

      fetchTests();
    } catch (error) {
      console.error('Error updating test status:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус теста",
        variant: "destructive"
      });
    }
  };

  const deleteTest = async (testId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот тест? Это действие нельзя отменить.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tests')
        .delete()
        .eq('id', testId);

      if (error) throw error;

      toast({
        title: "Тест удален",
        description: "Тест был успешно удален"
      });

      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить тест",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="h-8 bg-muted rounded w-64 mx-auto mb-4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-96 mx-auto animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardHeader>
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
          Панель администратора
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Управление тестами, разделами и мониторинг системы
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего тестов</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tests.length}</div>
            <p className="text-xs text-muted-foreground">
              {tests.filter(t => t.is_active).length} активных
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Разделы</CardTitle>
            <Settings className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Вопросы</CardTitle>
            <BarChart3 className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tests.reduce((sum, test) => sum + test.questions.length, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Пользователи</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Скоро</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tests" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tests">Тесты</TabsTrigger>
          <TabsTrigger value="categories">Разделы</TabsTrigger>
          <TabsTrigger value="groups">Группы</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Управление тестами</h2>
            <div className="flex gap-2">
              <ImportTest onSuccess={fetchTests} />
              <Dialog open={createTestOpen} onOpenChange={setCreateTestOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Создать тест
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Создать новый тест</DialogTitle>
                  <DialogDescription>
                    Заполните основную информацию о тесте
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateTest(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Название теста</Label>
                    <Input id="title" name="title" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea id="description" name="description" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Раздел</Label>
                    <Select name="category_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите раздел" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time_limit">Лимит времени (минуты)</Label>
                    <Input id="time_limit" name="time_limit" type="number" min="1" />
                  </div>
                  <Button type="submit" className="w-full">
                    Создать тест
                  </Button>
                </form>
              </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center space-x-2">
                        <span>{test.title}</span>
                        <Badge variant={test.is_active ? "default" : "secondary"}>
                          {test.is_active ? 'Активен' : 'Неактивен'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {test.categories.name} • {test.questions.length} вопросов
                        {test.time_limit_minutes && ` • ${test.time_limit_minutes} мин`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/test/${test.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin/test/${test.id}`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button
                        variant={test.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleTestStatus(test.id, test.is_active)}
                      >
                        {test.is_active ? 'Деактивировать' : 'Активировать'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTest(test.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {test.description && (
                  <CardContent>
                    <p className="text-muted-foreground">{test.description}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Управление разделами</h2>
            <Dialog open={createCategoryOpen} onOpenChange={setCreateCategoryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить раздел
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Добавить новый раздел</DialogTitle>
                  <DialogDescription>
                    Создайте новый раздел для тестов
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateCategory(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Название раздела</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Описание</Label>
                    <Textarea id="description" name="description" />
                  </div>
                  <Button type="submit" className="w-full">
                    Добавить раздел
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Edit Category Dialog */}
            <Dialog open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Редактировать раздел</DialogTitle>
                  <DialogDescription>
                    Измените информацию о разделе
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleEditCategory(new FormData(e.currentTarget));
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Название раздела</Label>
                    <Input 
                      id="edit-name" 
                      name="name" 
                      defaultValue={editingCategory?.name || ''} 
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Описание</Label>
                    <Textarea 
                      id="edit-description" 
                      name="description" 
                      defaultValue={editingCategory?.description || ''} 
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Сохранить изменения
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle>{category.name}</CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {tests.filter(t => t.categories.id === category.id).length} тестов
                    </span>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Управление группами</h2>
            <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Shuffle className="w-4 h-4 mr-2" />
                  Генерация групп
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Генерация сбалансированных групп</DialogTitle>
                  <DialogDescription>
                    Создание групп с автоматической балансировкой участников по уровню успеваемости
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-size">Количество участников в группе</Label>
                    <Input 
                      id="group-size"
                      type="number" 
                      min="2" 
                      max="20"
                      value={groupSize}
                      onChange={(e) => setGroupSize(parseInt(e.target.value) || 7)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Алгоритм автоматически распределит участников: 30% с высокими результатами, 30% со средними, 40% с низкими
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Название групп (базовое)</Label>
                    <Input 
                      id="group-name"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Команда"
                    />
                    <p className="text-xs text-muted-foreground">
                      К названию будет добавлен номер группы (например: "Команда 1", "Команда 2")
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCreateGroups} 
                      disabled={groupsLoading}
                      className="flex-1"
                    >
                      {groupsLoading ? 'Создание...' : 'Создать группы'}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setCreateGroupOpen(false)}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {groups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <Card key={group.id} className="shadow-medium">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <UsersRound className="w-5 h-5" />
                          <span>{group.name}</span>
                        </CardTitle>
                        <CardDescription>
                          {group.group_members.length} из {group.group_size} участников
                        </CardDescription>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Статистика по уровням */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-bold text-green-700">
                            {group.group_members.filter(m => m.performance_tier === 'high').length}
                          </div>
                          <div className="text-green-600">Высокий</div>
                        </div>
                        <div className="text-center p-2 bg-yellow-50 rounded">
                          <div className="font-bold text-yellow-700">
                            {group.group_members.filter(m => m.performance_tier === 'medium').length}
                          </div>
                          <div className="text-yellow-600">Средний</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="font-bold text-red-700">
                            {group.group_members.filter(m => m.performance_tier === 'low').length}
                          </div>
                          <div className="text-red-600">Низкий</div>
                        </div>
                      </div>

                      {/* Список участников */}
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Участники:</div>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {group.group_members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between text-xs">
                              <span className="truncate">{member.profiles.full_name}</span>
                              <Badge 
                                variant={
                                  member.performance_tier === 'high' ? 'default' :
                                  member.performance_tier === 'medium' ? 'secondary' : 'outline'
                                }
                                className="text-xs"
                              >
                                {member.performance_tier === 'high' ? 'В' : 
                                 member.performance_tier === 'medium' ? 'С' : 'Н'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UsersRound className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Группы не созданы</h3>
              <p className="text-muted-foreground mb-4">
                Нажмите "Генерация групп" для автоматического создания сбалансированных групп
              </p>
              <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Shuffle className="w-4 h-4 mr-2" />
                    Создать первые группы
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          )}

          {/* Edit Group Dialog */}
          <Dialog open={editGroupOpen} onOpenChange={setEditGroupOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Редактировать группу</DialogTitle>
                <DialogDescription>
                  Изменение информации о группе и управление участниками
                </DialogDescription>
              </DialogHeader>
              
              {editingGroup && (
                <div className="space-y-6">
                  {/* Group Info */}
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateGroup(new FormData(e.currentTarget));
                  }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-group-name">Название группы</Label>
                        <Input 
                          id="edit-group-name"
                          name="name" 
                          defaultValue={editingGroup.name}
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-group-description">Описание</Label>
                        <Input 
                          id="edit-group-description"
                          name="description" 
                          defaultValue={editingGroup.description || ''}
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm">
                      Сохранить изменения
                    </Button>
                  </form>

                  <div className="border-t pt-4">
                    <h4 className="text-lg font-semibold mb-3">Участники группы</h4>
                    
                    {/* Current Members */}
                    <div className="space-y-2 mb-4">
                      {editingGroup.group_members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                {member.profiles.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">{member.profiles.full_name}</div>
                              <div className="text-xs text-muted-foreground">
                                {member.total_score} баллов • {Math.round(member.average_percentage)}%
                              </div>
                            </div>
                            <Badge 
                              variant={
                                member.performance_tier === 'high' ? 'default' :
                                member.performance_tier === 'medium' ? 'secondary' : 'outline'
                              }
                              className="text-xs"
                            >
                              {member.performance_tier === 'high' ? 'Высокий' : 
                               member.performance_tier === 'medium' ? 'Средний' : 'Низкий'}
                            </Badge>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveMember(editingGroup.id, member.user_id, member.profiles.full_name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      {editingGroup.group_members.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">
                          В группе пока нет участников
                        </p>
                      )}
                    </div>

                    {/* Add Members */}
                    <div className="border-t pt-4">
                      <h5 className="font-medium mb-3">Добавить участников</h5>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {availableUsers.length > 0 ? (
                          availableUsers.map((user) => (
                            <div key={user.user_id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center space-x-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                    {user.full_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="text-sm font-medium">{user.full_name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {user.total_score} баллов • {Math.round(user.average_percentage)}%
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddMember(editingGroup.id, user.user_id)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground text-center py-4">
                            Все доступные участники уже распределены
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Аналитика в разработке</h3>
            <p className="text-muted-foreground">
              Здесь будет отображаться статистика по тестам и пользователям
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;