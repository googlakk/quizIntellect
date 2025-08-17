import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface UseAsyncOperationOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
}

interface AsyncOperationState {
  loading: boolean;
  error: Error | null;
}

export function useAsyncOperation<T = unknown>(
  options: UseAsyncOperationOptions<T> = {}
) {
  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
  });

  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Операция выполнена успешно',
    errorMessage = 'Произошла ошибка',
  } = options;

  const execute = useCallback(
    async (asyncFunction: () => Promise<T>): Promise<T | null> => {
      setState({ loading: true, error: null });

      try {
        const result = await asyncFunction();
        
        setState({ loading: false, error: null });
        
        if (showSuccessToast) {
          toast({
            title: "Успешно",
            description: successMessage,
          });
        }
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Неизвестная ошибка');
        
        setState({ loading: false, error: err });
        
        if (showErrorToast) {
          toast({
            title: "Ошибка",
            description: errorMessage,
            variant: "destructive",
          });
        }
        
        if (onError) {
          onError(err);
        }
        
        return null;
      }
    },
    [onSuccess, onError, showSuccessToast, showErrorToast, successMessage, errorMessage]
  );

  const reset = useCallback(() => {
    setState({ loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for data fetching
export function useAsyncFetch<T>(
  options: UseAsyncOperationOptions<T> = {}
) {
  return useAsyncOperation<T>({
    ...options,
    showErrorToast: options.showErrorToast ?? true,
    errorMessage: options.errorMessage ?? 'Не удалось загрузить данные',
  });
}

// Specialized hook for mutations (create, update, delete)
export function useAsyncMutation<T>(
  options: UseAsyncOperationOptions<T> = {}
) {
  return useAsyncOperation<T>({
    ...options,
    showSuccessToast: options.showSuccessToast ?? true,
    showErrorToast: options.showErrorToast ?? true,
    errorMessage: options.errorMessage ?? 'Не удалось выполнить операцию',
  });
}