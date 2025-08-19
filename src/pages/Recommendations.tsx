import AIRecommendations from '@/components/AIRecommendations';
import { Sparkles, Brain, Target } from 'lucide-react';

const Recommendations = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-4 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary mr-3" />
          Рекомендации ИИ
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Персональные советы и рекомендации на основе анализа ваших результатов тестирования
        </p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-6 rounded-lg bg-primary/5 border border-primary/10">
          <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-2">ИИ Анализ</h3>
          <p className="text-sm text-muted-foreground">
            Искусственный интеллект анализирует ваши ответы и выявляет паттерны
          </p>
        </div>
        
        <div className="text-center p-6 rounded-lg bg-secondary/5 border border-secondary/10">
          <Target className="w-8 h-8 text-secondary mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Целевые советы</h3>
          <p className="text-sm text-muted-foreground">
            Рекомендации основаны на целях, заданных при создании теста
          </p>
        </div>
        
        <div className="text-center p-6 rounded-lg bg-accent/5 border border-accent/10">
          <Brain className="w-8 h-8 text-accent mx-auto mb-3" />
          <h3 className="font-semibold mb-2">Персонализация</h3>
          <p className="text-sm text-muted-foreground">
            Каждая рекомендация адаптирована под ваш уровень и потребности
          </p>
        </div>
      </div>

      {/* Recommendations Component */}
      <AIRecommendations showAll={true} />
    </div>
  );
};

export default Recommendations;