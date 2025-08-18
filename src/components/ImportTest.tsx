import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { importTestSchema, ImportTestFormData } from '@/lib/validations';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  X,
  Download
} from 'lucide-react';

interface ImportTestProps {
  onSuccess?: () => void;
}

const ImportTest = ({ onSuccess }: ImportTestProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [testData, setTestData] = useState<ImportTestFormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/json') {
      toast({
        title: "Неверный формат файла",
        description: "Пожалуйста, выберите JSON файл",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    setErrors([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        const validationResult = importTestSchema.safeParse(jsonData);
        
        if (!validationResult.success) {
          const errorMessages = validationResult.error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          );
          setErrors(errorMessages);
          setTestData(null);
        } else {
          setTestData(validationResult.data);
          setErrors([]);
        }
      } catch (error) {
        setErrors(['Некорректный JSON формат']);
        setTestData(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleImport = async () => {
    if (!testData) return;

    setLoading(true);
    setProgress(0);

    try {
      // 1. Найти или создать категорию
      setProgress(20);
      let categoryId: string;
      
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('name', testData.category)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: testData.category,
            description: `Автоматически создана при импорте теста "${testData.title}"`
          })
          .select('id')
          .single();

        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
      }

      // 2. Создать тест
      setProgress(40);
      const maxScore = testData.test_type === 'assessment' && testData.assessment_scales
        ? testData.questions.length * Math.max(...testData.assessment_scales.map(s => s.points))
        : testData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      
      const { data: test, error: testError } = await supabase
        .from('tests')
        .insert({
          title: testData.title,
          description: testData.description,
          category_id: categoryId,
          time_limit_minutes: testData.time_limit_minutes,
          max_score: maxScore,
          test_type: testData.test_type || 'quiz',
          is_active: true
        })
        .select('id')
        .single();

      if (testError) throw testError;

      // 2.5. Создать шкалу оценок для оценочных тестов
      if (testData.test_type === 'assessment' && testData.assessment_scales) {
        setProgress(50);
        
        const scalesData = testData.assessment_scales.map((scale, index) => ({
          test_id: test.id,
          label: scale.label,
          points: scale.points,
          order_index: scale.order_index !== undefined ? scale.order_index : index
        }));

        const { error: scalesError } = await supabase
          .from('assessment_scales')
          .insert(scalesData);

        if (scalesError) throw scalesError;
      }

      // 3. Создать вопросы и варианты ответов
      setProgress(60);
      
      for (let i = 0; i < testData.questions.length; i++) {
        const questionData = testData.questions[i];
        
        // Для оценочных тестов используем максимальные баллы из шкалы
        const questionPoints = testData.test_type === 'assessment' && testData.assessment_scales
          ? Math.max(...testData.assessment_scales.map(s => s.points))
          : (questionData.points || 1);
        
        const { data: question, error: questionError } = await supabase
          .from('questions')
          .insert({
            test_id: test.id,
            question_text: questionData.question_text,
            question_type: questionData.question_type,
            points: questionPoints,
            order_index: i
          })
          .select('id')
          .single();

        if (questionError) throw questionError;

        // Создать варианты ответов (только для выборочных вопросов и НЕ для оценочных тестов)
        if (testData.test_type !== 'assessment' && questionData.options && questionData.options.length > 0) {
          const optionsToInsert = questionData.options.map((option, index) => ({
            question_id: question.id,
            option_text: option.text,
            is_correct: option.correct,
            order_index: index
          }));

          const { error: optionsError } = await supabase
            .from('answer_options')
            .insert(optionsToInsert);

          if (optionsError) throw optionsError;
        }

        setProgress(60 + (40 * (i + 1)) / testData.questions.length);
      }

      setProgress(100);

      toast({
        title: "Тест успешно импортирован!",
        description: testData.test_type === 'assessment' 
          ? `Создан оценочный тест "${testData.title}" с ${testData.questions.length} вопросами и ${testData.assessment_scales?.length || 0} уровнями оценки`
          : `Создан тест "${testData.title}" с ${testData.questions.length} вопросами`
      });

      setOpen(false);
      setFile(null);
      setTestData(null);
      onSuccess?.();

    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Ошибка импорта",
        description: "Не удалось импортировать тест. Проверьте формат файла.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const downloadExample = () => {
    const exampleTest = {
      title: "Пример теста по компьютерной грамотности",
      description: "Демонстрационный тест для понимания структуры JSON файла",
      category: "Компьютерная грамотность",
      test_type: "quiz",
      time_limit_minutes: 30,
      questions: [
        {
          question_text: "Что такое операционная система?",
          question_type: "single_choice",
          points: 2,
          options: [
            { text: "Программа для работы с файлами", correct: false },
            { text: "Основная программа, управляющая компьютером", correct: true },
            { text: "Антивирусная программа", correct: false },
            { text: "Игровая программа", correct: false }
          ]
        },
        {
          question_text: "Какие из перечисленных являются браузерами? (выберите несколько)",
          question_type: "multiple_choice",
          points: 3,
          options: [
            { text: "Google Chrome", correct: true },
            { text: "Microsoft Word", correct: false },
            { text: "Mozilla Firefox", correct: true },
            { text: "Adobe Photoshop", correct: false },
            { text: "Safari", correct: true }
          ]
        },
        {
          question_text: "Опишите, что такое файловая система",
          question_type: "text",
          points: 5
        }
      ]
    };

    const blob = new Blob([JSON.stringify(exampleTest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'example-test.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Импортировать тест
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт теста из JSON</DialogTitle>
          <DialogDescription>
            Загрузите JSON файл с тестом для быстрого создания
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Example */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div>
              <h4 className="font-medium text-blue-900">Нужен пример?</h4>
              <p className="text-sm text-blue-700">Скачайте образец JSON файла для понимания структуры</p>
            </div>
            <Button onClick={downloadExample} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Скачать пример
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <Label>Выберите JSON файл</Label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-gray-600">
                  Перетащите JSON файл сюда или нажмите для выбора
                </p>
                <Input
                  type="file"
                  accept=".json"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-medium">Ошибки валидации:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {testData && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-lg">Предварительный просмотр</CardTitle>
                </div>
                <CardDescription>Проверьте данные перед импортом</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">{testData.title}</h3>
                  {testData.description && (
                    <p className="text-sm text-muted-foreground">{testData.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">Категория: {testData.category}</Badge>
                  <Badge variant={testData.test_type === 'assessment' ? "outline" : "destructive"}>
                    {testData.test_type === 'assessment' ? 'Оценочный тест' : 'Обычный тест'}
                  </Badge>
                  <Badge variant="outline">Вопросов: {testData.questions.length}</Badge>
                  {testData.time_limit_minutes && (
                    <Badge variant="outline">Время: {testData.time_limit_minutes} мин</Badge>
                  )}
                  <Badge variant="outline">
                    Баллов: {testData.test_type === 'assessment' && testData.assessment_scales
                      ? `${testData.questions.length * Math.max(...testData.assessment_scales.map(s => s.points))} (макс)`
                      : testData.questions.reduce((sum, q) => sum + (q.points || 1), 0)
                    }
                  </Badge>
                  {testData.test_type === 'assessment' && testData.assessment_scales && (
                    <Badge variant="outline">Шкала: {testData.assessment_scales.length} уровней</Badge>
                  )}
                </div>

                {/* Assessment Scale Preview */}
                {testData.test_type === 'assessment' && testData.assessment_scales && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Шкала оценок:</h4>
                    <div className="space-y-1">
                      {testData.assessment_scales
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        .map((scale, index) => (
                          <div key={index} className="text-sm p-2 bg-blue-50 rounded flex justify-between items-center">
                            <span>{scale.label}</span>
                            <Badge size="sm" variant="outline">{scale.points} балл</Badge>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Вопросы:</h4>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {testData.questions.map((q, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        <span className="font-medium">{index + 1}.</span> {q.question_text}
                        <div className="flex gap-2 mt-1">
                          <Badge size="sm" variant="outline">{q.question_type}</Badge>
                          {testData.test_type === 'assessment' ? (
                            <Badge size="sm" variant="outline">Самооценка</Badge>
                          ) : (
                            <Badge size="sm" variant="outline">{q.points || 1} балл</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Импорт теста...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleImport}
              disabled={!testData || loading || errors.length > 0}
            >
              {loading ? 'Импортируем...' : 'Импортировать тест'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTest;