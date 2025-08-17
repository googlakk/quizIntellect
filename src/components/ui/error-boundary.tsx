import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<Record<string, unknown>>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

export const ErrorFallback = ({ error, onRetry }: ErrorFallbackProps) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">Произошла ошибка</CardTitle>
          <CardDescription>
            К сожалению, что-то пошло не так. Попробуйте обновить страницу или вернуться на главную.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground mb-2">
                Техническая информация
              </summary>
              <pre className="whitespace-pre-wrap text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}
          <div className="flex space-x-2">
            <Button onClick={handleRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link to="/">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showRetry?: boolean;
  className?: string;
}

export const ErrorMessage = ({ 
  title = "Ошибка", 
  message, 
  onRetry, 
  showRetry = true,
  className 
}: ErrorMessageProps) => {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div className="flex-1 space-y-2">
            <h3 className="font-medium text-destructive">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
            {showRetry && onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Повторить
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};