import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GenerateRecommendationsParams {
  testResultId: string;
  userId: string;
  testId: string;
  aiGoal: string;
  userAnswers: any[];
  testData: {
    title: string;
    description?: string;
    questions: any[];
  };
  userProfile: {
    full_name: string;
  };
}

export const useAIRecommendations = () => {
  const [generating, setGenerating] = useState(false);

  const generateRecommendations = async (params: GenerateRecommendationsParams) => {
    try {
      setGenerating(true);

      console.log('Отправляем запрос к Edge функции с параметрами:', {
        testResultId: params.testResultId,
        userId: params.userId,
        testId: params.testId,
        aiGoal: params.aiGoal?.substring(0, 100) + '...',
        userAnswersCount: params.userAnswers?.length || 0,
        testTitle: params.testData?.title,
        userName: params.userProfile?.full_name
      });

      // Проверяем обязательные параметры
      if (!params.testResultId || !params.userId || !params.testId || !params.aiGoal) {
        throw new Error('Отсутствуют обязательные параметры для генерации рекомендаций');
      }

      // Вызываем Edge Function для генерации рекомендаций
      const { data, error } = await supabase.functions.invoke('generate-ai-recommendations', {
        body: params
      });

      console.log('Ответ от Edge функции:', { data, error });

      if (error) {
        console.error('Ошибка Edge функции:', error);
        throw error;
      }

      if (!data || !data.success) {
        console.error('Edge функция вернула ошибку:', data);
        throw new Error(data?.error || 'Не удалось сгенерировать рекомендации');
      }

      toast({
        title: "Рекомендации готовы!",
        description: "ИИ проанализировал ваши ответы и подготовил персональные рекомендации"
      });

      return data.recommendations;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      
      let errorMessage = 'Не удалось сгенерировать рекомендации';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as { message: string }).message;
      }

      toast({
        title: "Ошибка генерации рекомендаций",
        description: errorMessage,
        variant: "destructive"
      });

      throw error;
    } finally {
      setGenerating(false);
    }
  };

  const checkExistingRecommendations = async (testResultId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('id')
        .eq('test_result_id', testResultId)
        .eq('user_id', userId)
        .limit(1);

      if (error) {
        throw error;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking existing recommendations:', error);
      return false;
    }
  };

  return {
    generateRecommendations,
    checkExistingRecommendations,
    generating
  };
};