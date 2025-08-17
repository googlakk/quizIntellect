import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: "Ошибка входа",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в QuizForge!"
      });
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const subject = formData.get('subject') as string;
    const loginUsername = formData.get('loginUsername') as string;

    const { error } = await signUp(email, password, fullName, subject, loginUsername);
    
    if (error) {
      toast({
        title: "Ошибка регистрации",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Регистрация успешна",
        description: "Проверьте почту для подтверждения аккаунта"
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4 animate-float">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent mb-2">
            QuizForge
          </h1>
          <p className="text-muted-foreground">Платформа онлайн-тестирования</p>
        </div>

        <Card className="shadow-strong border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Добро пожаловать</CardTitle>
            <CardDescription>
              Войдите в систему или создайте новый аккаунт
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input 
                      id="signin-email" 
                      name="email" 
                      type="email" 
                      required 
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Пароль</Label>
                    <Input 
                      id="signin-password" 
                      name="password" 
                      type="password" 
                      required 
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    variant="default"
                  >
                    {loading ? "Вход..." : "Войти"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">ФИО</Label>
                    <Input 
                      id="signup-fullname" 
                      name="fullName" 
                      required 
                      placeholder="Иванов Иван Иванович"
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-subject">Предмет</Label>
                    <Input 
                      id="signup-subject" 
                      name="subject" 
                      required 
                      placeholder="Математика"
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Логин</Label>
                    <Input 
                      id="signup-username" 
                      name="loginUsername" 
                      required 
                      placeholder="ivan_teacher"
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      name="email" 
                      type="email" 
                      required 
                      placeholder="ivan@school.com"
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Пароль</Label>
                    <Input 
                      id="signup-password" 
                      name="password" 
                      type="password" 
                      required 
                      className="transition-all duration-medium focus:shadow-soft"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    variant="secondary"
                  >
                    {loading ? "Регистрация..." : "Создать аккаунт"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-card rounded-lg shadow-soft">
            <BookOpen className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Тесты</p>
          </div>
          <div className="p-4 bg-card rounded-lg shadow-soft">
            <GraduationCap className="w-6 h-6 text-secondary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Результаты</p>
          </div>
          <div className="p-4 bg-card rounded-lg shadow-soft">
            <Users className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Рейтинг</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;