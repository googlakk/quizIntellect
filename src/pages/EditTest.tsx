import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createQuestionWithOptionsSchema, CreateQuestionWithOptionsFormData, editTestSchema, EditTestFormData } from '@/lib/validations';
import { LoadingState } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-boundary';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  Save,
  Eye,
  Settings,
  HelpCircle,
  CheckSquare,
  FileText,
  Move
} from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  max_score: number;
  time_limit_minutes: number | null;
  is_active: boolean;
  test_type: string;
  categories: {
    id: string;
    name: string;
  };
  assessment_scales?: {
    id: string;
    label: string;
    points: number;
    order_index: number;
  }[];
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  points: number;
  order_index: number;
  time_limit_seconds?: number;
  answer_options: {
    id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

const questionTypeIcons = {
  single_choice: HelpCircle,
  multiple_choice: CheckSquare,
  text: FileText
};

const questionTypeLabels = {
  single_choice: 'Один вариант',
  multiple_choice: 'Несколько вариантов',
  text: 'Текстовый ответ'
};

const EditTest = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQuestionOpen, setEditQuestionOpen] = useState(false);
  const [editTestOpen, setEditTestOpen] = useState(false);

  const { loading, error, execute } = useAsyncOperation({
    showErrorToast: true,
    errorMessage: 'Не удалось загрузить данные теста'
  });

  const createQuestionForm = useForm<CreateQuestionWithOptionsFormData>({
    resolver: zodResolver(createQuestionWithOptionsSchema),
    defaultValues: {
      question_text: '',
      question_type: 'single_choice',
      points: 1,
      order_index: 0,
      time_limit_seconds: undefined,
      answer_options: [
        { option_text: '', is_correct: true, order_index: 0 },
        { option_text: '', is_correct: false, order_index: 1 }
      ]
    }
  });

  const editQuestionForm = useForm<CreateQuestionWithOptionsFormData>({
    resolver: zodResolver(createQuestionWithOptionsSchema),
    defaultValues: {
      question_text: '',
      question_type: 'single_choice',
      points: 1,
      order_index: 0,
      time_limit_seconds: undefined,
      answer_options: [
        { option_text: '', is_correct: true, order_index: 0 },
        { option_text: '', is_correct: false, order_index: 1 }
      ]
    }
  });

  const editTestForm = useForm<EditTestFormData>({
    resolver: zodResolver(editTestSchema),
    defaultValues: {
      title: '',
      description: '',
      category_id: '',
      time_limit_minutes: undefined,
      is_active: true
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: createQuestionForm.control,
    name: 'answer_options'
  });

  const { fields: editFields, append: editAppend, remove: editRemove } = useFieldArray({
    control: editQuestionForm.control,
    name: 'answer_options'
  });

  useEffect(() => {
    if (testId) {
      execute(async () => {
        await Promise.all([fetchTestData(), fetchCategories()]);
      });
    }
  }, [testId]);

  const fetchTestData = async () => {
    // Fetch test info
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select(`
        *,
        categories:category_id (id, name),
        assessment_scales (
          id,
          label,
          points,
          order_index
        )
      `)
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      throw new Error('Тест не найден');
    }

    setTest(testData as Test);

    // Fetch questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select(`
        *,
        answer_options (
          id,
          option_text,
          is_correct,
          order_index
        )
      `)
      .eq('test_id', testId)
      .order('order_index');

    if (questionsError) {
      throw new Error('Не удалось загрузить вопросы');
    }

    const sortedQuestions = (questionsData || []).map(q => ({
      ...q,
      answer_options: q.answer_options.sort((a, b) => a.order_index - b.order_index)
    }));

    setQuestions(sortedQuestions as Question[]);
  };

  const fetchCategories = async () => {
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');

    if (categoriesError) {
      throw new Error('Не удалось загрузить категории');
    }

    setCategories(categoriesData || []);
  };

  const handleEditTest = () => {
    if (!test) return;
    
    editTestForm.reset({
      title: test.title,
      description: test.description || '',
      category_id: test.categories.id,
      time_limit_minutes: test.time_limit_minutes || undefined,
      is_active: test.is_active
    });
    
    setEditTestOpen(true);
  };

  const handleUpdateTest = async (data: EditTestFormData) => {
    if (!test) return;

    try {
      const { error } = await supabase
        .from('tests')
        .update({
          title: data.title,
          description: data.description || null,
          category_id: data.category_id,
          time_limit_minutes: data.time_limit_minutes || null,
          is_active: data.is_active
        })
        .eq('id', test.id);

      if (error) throw error;

      toast({
        title: "Тест обновлен",
        description: "Настройки теста успешно сохранены"
      });

      setEditTestOpen(false);
      // Перезагружаем данные теста
      await fetchTestData();
    } catch (error) {
      console.error('Error updating test:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить тест",
        variant: "destructive"
      });
    }
  };

  const handleCreateQuestion = async (data: CreateQuestionWithOptionsFormData) => {
    if (!test) return;

    try {
      // Для оценочных тестов устанавливаем максимальные баллы из шкалы
      const questionPoints = test.test_type === 'assessment' 
        ? (test.assessment_scales?.reduce((max, scale) => Math.max(max, scale.points), 0) || 4)
        : data.points;

      // Create question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          test_id: test.id,
          question_text: data.question_text,
          question_type: data.question_type,
          points: questionPoints,
          order_index: questions.length,
          time_limit_seconds: data.time_limit_seconds
        })
        .select()
        .single();

      if (questionError) throw questionError;

      // Create answer options (only for choice questions and NOT for assessment tests)
      if (test.test_type !== 'assessment' && data.question_type !== 'text' && data.answer_options.length > 0) {
        const optionsToInsert = data.answer_options.map((option, index) => ({
          question_id: questionData.id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          order_index: index
        }));

        const { error: optionsError } = await supabase
          .from('answer_options')
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      // Update test max score
      const newMaxScore = questions.reduce((sum, q) => sum + q.points, 0) + questionPoints;
      await supabase
        .from('tests')
        .update({ max_score: newMaxScore })
        .eq('id', test.id);

      toast({
        title: "Вопрос добавлен",
        description: "Вопрос успешно добавлен к тесту"
      });

      setCreateQuestionOpen(false);
      createQuestionForm.reset();
      fetchTestData();
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать вопрос",
        variant: "destructive"
      });
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    
    // Заполняем форму данными вопроса
    editQuestionForm.reset({
      question_text: question.question_text,
      question_type: question.question_type as any,
      points: question.points,
      order_index: question.order_index,
      time_limit_seconds: question.time_limit_seconds,
      answer_options: question.answer_options.map(opt => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        order_index: opt.order_index
      }))
    });
    
    setEditQuestionOpen(true);
  };

  const handleUpdateQuestion = async (data: CreateQuestionWithOptionsFormData) => {
    if (!editingQuestion || !test) return;

    try {
      // Для оценочных тестов устанавливаем максимальные баллы из шкалы
      const questionPoints = test.test_type === 'assessment' 
        ? (test.assessment_scales?.reduce((max, scale) => Math.max(max, scale.points), 0) || 4)
        : data.points;

      // Обновляем вопрос
      const { error: questionError } = await supabase
        .from('questions')
        .update({
          question_text: data.question_text,
          question_type: data.question_type,
          points: questionPoints,
          time_limit_seconds: data.time_limit_seconds
        })
        .eq('id', editingQuestion.id);

      if (questionError) throw questionError;

      // Удаляем старые варианты ответов (только для обычных тестов)
      if (test.test_type !== 'assessment') {
        await supabase
          .from('answer_options')
          .delete()
          .eq('question_id', editingQuestion.id);

        // Создаем новые варианты ответов (только для выборочных вопросов)
        if (data.question_type !== 'text' && data.answer_options.length > 0) {
          const optionsToInsert = data.answer_options.map((option, index) => ({
            question_id: editingQuestion.id,
            option_text: option.option_text,
            is_correct: option.is_correct,
            order_index: index
          }));

          const { error: optionsError } = await supabase
            .from('answer_options')
            .insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }
      }

      toast({
        title: "Вопрос обновлен",
        description: "Вопрос успешно обновлен"
      });

      setEditQuestionOpen(false);
      setEditingQuestion(null);
      editQuestionForm.reset();
      fetchTestData();
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить вопрос",
        variant: "destructive"
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот вопрос?')) return;

    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Вопрос удален",
        description: "Вопрос был успешно удален"
      });

      fetchTestData();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить вопрос",
        variant: "destructive"
      });
    }
  };

  const addAnswerOption = () => {
    append({
      option_text: '',
      is_correct: false,
      order_index: fields.length
    });
  };

  const removeAnswerOption = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  const addEditAnswerOption = () => {
    editAppend({
      option_text: '',
      is_correct: false,
      order_index: editFields.length
    });
  };

  const removeEditAnswerOption = (index: number) => {
    if (editFields.length > 2) {
      editRemove(index);
    }
  };

  if (loading) {
    return <LoadingState message="Загрузка теста..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        message={error.message} 
        onRetry={() => execute(() => fetchTestData())} 
      />
    );
  }

  if (!test) {
    return (
      <ErrorMessage 
        message="Тест не найден" 
        showRetry={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{test.title}</h1>
            <p className="text-muted-foreground">{test.categories.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={test.is_active ? "default" : "secondary"}>
            {test.is_active ? 'Активен' : 'Неактивен'}
          </Badge>
          <Button variant="outline" onClick={handleEditTest}>
            <Settings className="w-4 h-4 mr-2" />
            Настройки
          </Button>
          <Button variant="outline" onClick={() => navigate(`/test/${test.id}`)}>
            <Eye className="w-4 h-4 mr-2" />
            Предпросмотр
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{questions.length}</div>
            <p className="text-xs text-muted-foreground">Вопросов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{test.max_score}</div>
            <p className="text-xs text-muted-foreground">Макс. баллов</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {test.time_limit_minutes || '∞'}
            </div>
            <p className="text-xs text-muted-foreground">Минут</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Попыток</p>
          </CardContent>
        </Card>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Вопросы</CardTitle>
              <CardDescription>
                Управление вопросами теста
              </CardDescription>
            </div>
            <Dialog open={createQuestionOpen} onOpenChange={setCreateQuestionOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить вопрос
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Создать новый вопрос</DialogTitle>
                  <DialogDescription>
                    Добавьте вопрос и варианты ответов
                  </DialogDescription>
                </DialogHeader>
                <Form {...createQuestionForm}>
                  <form onSubmit={createQuestionForm.handleSubmit(handleCreateQuestion)} className="space-y-6">
                    <FormField
                      control={createQuestionForm.control}
                      name="question_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст вопроса</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Введите текст вопроса..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={createQuestionForm.control}
                        name="question_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Тип вопроса</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single_choice">Один вариант</SelectItem>
                                <SelectItem value="multiple_choice">Несколько вариантов</SelectItem>
                                <SelectItem value="text">Текстовый ответ</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createQuestionForm.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {test?.test_type === 'assessment' ? 'Макс. баллы' : 'Баллы'}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                disabled={test?.test_type === 'assessment'}
                                value={test?.test_type === 'assessment' ? test.assessment_scales?.reduce((max, scale) => Math.max(max, scale.points), 0) || 4 : field.value}
                              />
                            </FormControl>
                            {test?.test_type === 'assessment' && (
                              <p className="text-xs text-muted-foreground">
                                Автоматически установлено по шкале оценок
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={createQuestionForm.control}
                        name="time_limit_seconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Время (секунды)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="Без ограничений"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Время на ответ для этого вопроса
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Answer Options - Different interface for assessment tests */}
                    {createQuestionForm.watch('question_type') !== 'text' && (
                      <div className="space-y-4">
                        {test?.test_type === 'assessment' ? (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">🎯 Оценочный тест</h4>
                            <p className="text-sm text-blue-700 mb-3">
                              Для оценочных тестов используется единая шкала оценок. Вопросы не имеют правильных/неправильных ответов - пользователи оценивают свой уровень владения навыком.
                            </p>
                            
                            {test.assessment_scales && test.assessment_scales.length > 0 ? (
                              <div className="space-y-2">
                                <Label className="text-blue-800">Используемая шкала оценок:</Label>
                                {test.assessment_scales
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((scale) => (
                                    <div key={scale.id} className="flex justify-between items-center p-2 bg-white border rounded">
                                      <span className="text-sm">{scale.label}</span>
                                      <Badge variant="outline">{scale.points} {scale.points === 1 ? 'балл' : scale.points < 5 ? 'балла' : 'баллов'}</Badge>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-amber-600">
                                ⚠️ Шкала оценок не настроена для этого теста
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <Label>Варианты ответов</Label>
                              <Button type="button" variant="outline" size="sm" onClick={addAnswerOption}>
                                <Plus className="w-3 h-3 mr-1" />
                                Добавить вариант
                              </Button>
                            </div>
                          </>
                        )}
                        
                        {/* Show regular answer options only for non-assessment tests */}
                        {test?.test_type !== 'assessment' && (
                          <>
                          {fields.map((field, index) => (
                          <div key={field.id} className="flex items-start space-x-2 p-3 border rounded-lg">
                            <FormField
                              control={createQuestionForm.control}
                              name={`answer_options.${index}.is_correct`}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 pt-2">
                                  <FormControl>
                                    {createQuestionForm.watch('question_type') === 'single_choice' ? (
                                      <RadioGroup
                                        value={createQuestionForm.getValues('answer_options').findIndex(opt => opt.is_correct).toString()}
                                        onValueChange={(value) => {
                                          const options = createQuestionForm.getValues('answer_options');
                                          options.forEach((opt, i) => {
                                            createQuestionForm.setValue(`answer_options.${i}.is_correct`, i === parseInt(value));
                                          });
                                        }}
                                      >
                                        <RadioGroupItem value={index.toString()} />
                                      </RadioGroup>
                                    ) : (
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    )}
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={createQuestionForm.control}
                              name={`answer_options.${index}.option_text`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input 
                                      placeholder={`Вариант ${index + 1}`}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {fields.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeAnswerOption(index)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setCreateQuestionOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        <Save className="w-4 h-4 mr-2" />
                        Создать вопрос
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Edit Question Dialog */}
            <Dialog open={editQuestionOpen} onOpenChange={setEditQuestionOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Редактировать вопрос</DialogTitle>
                  <DialogDescription>
                    Измените вопрос и варианты ответов
                  </DialogDescription>
                </DialogHeader>
                <Form {...editQuestionForm}>
                  <form onSubmit={editQuestionForm.handleSubmit(handleUpdateQuestion)} className="space-y-6">
                    <FormField
                      control={editQuestionForm.control}
                      name="question_text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Текст вопроса</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Введите текст вопроса..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={editQuestionForm.control}
                        name="question_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Тип вопроса</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="single_choice">Один вариант</SelectItem>
                                <SelectItem value="multiple_choice">Несколько вариантов</SelectItem>
                                <SelectItem value="text">Текстовый ответ</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editQuestionForm.control}
                        name="points"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {test?.test_type === 'assessment' ? 'Макс. баллы' : 'Баллы'}
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                disabled={test?.test_type === 'assessment'}
                                value={test?.test_type === 'assessment' ? test.assessment_scales?.reduce((max, scale) => Math.max(max, scale.points), 0) || 4 : field.value}
                              />
                            </FormControl>
                            {test?.test_type === 'assessment' && (
                              <p className="text-xs text-muted-foreground">
                                Автоматически установлено по шкале оценок
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editQuestionForm.control}
                        name="time_limit_seconds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Время (секунды)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0"
                                placeholder="Без ограничений"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Время на ответ для этого вопроса
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Answer Options for Edit */}
                    {editQuestionForm.watch('question_type') !== 'text' && (
                      <div className="space-y-4">
                        {test?.test_type === 'assessment' ? (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-medium text-blue-800 mb-2">🎯 Оценочный тест</h4>
                            <p className="text-sm text-blue-700 mb-3">
                              Для оценочных тестов используется единая шкала оценок. Вопросы не имеют правильных/неправильных ответов - пользователи оценивают свой уровень владения навыком.
                            </p>
                            
                            {test.assessment_scales && test.assessment_scales.length > 0 ? (
                              <div className="space-y-2">
                                <Label className="text-blue-800">Используемая шкала оценок:</Label>
                                {test.assessment_scales
                                  .sort((a, b) => a.order_index - b.order_index)
                                  .map((scale) => (
                                    <div key={scale.id} className="flex justify-between items-center p-2 bg-white border rounded">
                                      <span className="text-sm">{scale.label}</span>
                                      <Badge variant="outline">{scale.points} {scale.points === 1 ? 'балл' : scale.points < 5 ? 'балла' : 'баллов'}</Badge>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-amber-600">
                                ⚠️ Шкала оценок не настроена для этого теста
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <Label>Варианты ответов</Label>
                              <Button type="button" variant="outline" size="sm" onClick={addEditAnswerOption}>
                                <Plus className="w-3 h-3 mr-1" />
                                Добавить вариант
                              </Button>
                            </div>
                          </>
                        )}
                        
                        {/* Show regular answer options only for non-assessment tests */}
                        {test?.test_type !== 'assessment' && (
                          <>
                          {editFields.map((field, index) => (
                          <div key={field.id} className="flex items-start space-x-2 p-3 border rounded-lg">
                            <FormField
                              control={editQuestionForm.control}
                              name={`answer_options.${index}.is_correct`}
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 pt-2">
                                  <FormControl>
                                    {editQuestionForm.watch('question_type') === 'single_choice' ? (
                                      <RadioGroup
                                        value={editQuestionForm.getValues('answer_options').findIndex(opt => opt.is_correct).toString()}
                                        onValueChange={(value) => {
                                          const options = editQuestionForm.getValues('answer_options');
                                          options.forEach((opt, i) => {
                                            editQuestionForm.setValue(`answer_options.${i}.is_correct`, i === parseInt(value));
                                          });
                                        }}
                                      >
                                        <RadioGroupItem value={index.toString()} />
                                      </RadioGroup>
                                    ) : (
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    )}
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={editQuestionForm.control}
                              name={`answer_options.${index}.option_text`}
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input 
                                      placeholder={`Вариант ${index + 1}`}
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            {editFields.length > 2 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeEditAnswerOption(index)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setEditQuestionOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить изменения
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            {/* Edit Test Dialog */}
            <Dialog open={editTestOpen} onOpenChange={setEditTestOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Настройки теста</DialogTitle>
                  <DialogDescription>
                    Измените основные параметры теста
                  </DialogDescription>
                </DialogHeader>
                <Form {...editTestForm}>
                  <form onSubmit={editTestForm.handleSubmit(handleUpdateTest)} className="space-y-6">
                    <FormField
                      control={editTestForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название теста</FormLabel>
                          <FormControl>
                            <Input placeholder="Введите название теста..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editTestForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Краткое описание теста..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editTestForm.control}
                      name="category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Категория</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Выберите категорию" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editTestForm.control}
                      name="time_limit_minutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Лимит времени (минуты)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1"
                              placeholder="Без ограничений"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Оставьте пустым для неограниченного времени
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editTestForm.control}
                      name="is_active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Активный тест
                            </FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Только активные тесты доступны для прохождения
                            </p>
                          </div>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setEditTestOpen(false)}>
                        Отмена
                      </Button>
                      <Button type="submit">
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить изменения
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length > 0 ? (
            <div className="space-y-4">
              {questions.map((question, index) => {
                const IconComponent = questionTypeIcons[question.question_type as keyof typeof questionTypeIcons];
                return (
                  <Card key={question.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              <IconComponent className="w-3 h-3 mr-1" />
                              {questionTypeLabels[question.question_type as keyof typeof questionTypeLabels]}
                            </Badge>
                            <Badge variant="default" className="text-xs">
                              {question.points} балл{question.points !== 1 ? 'ов' : ''}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{question.question_text}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditQuestion(question)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => toast({ title: "В разработке", description: "Функция перемещения вопроса будет добавлена в ближайшее время" })}>
                            <Move className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteQuestion(question.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {question.answer_options.length > 0 && (
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {question.answer_options.map((option) => (
                            <div 
                              key={option.id} 
                              className={`flex items-center space-x-2 p-2 rounded text-sm ${
                                option.is_correct ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full ${
                                option.is_correct ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
                              <span>{option.option_text}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Нет вопросов</h3>
              <p className="text-muted-foreground mb-4">
                Добавьте первый вопрос, чтобы начать создание теста
              </p>
              <Button onClick={() => setCreateQuestionOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Добавить вопрос
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EditTest;