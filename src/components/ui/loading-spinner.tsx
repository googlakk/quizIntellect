import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = ({ size = "md", className }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };

  return (
    <Loader2 
      className={cn(
        "animate-spin",
        sizeClasses[size],
        className
      )} 
    />
  );
};

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingState = ({ 
  message = "Загрузка...", 
  size = "md", 
  className 
}: LoadingStateProps) => {
  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <LoadingSpinner size={size} />
      <span className="text-muted-foreground">{message}</span>
    </div>
  );
};

export const FullPageLoadingState = ({ message = "Загрузка..." }: { message?: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingState message={message} size="lg" />
    </div>
  );
};