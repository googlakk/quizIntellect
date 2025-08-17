import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Navigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInSchema, signUpSchema, SignInFormData, SignUpFormData } from '@/lib/validations';

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);

  const signInForm = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      subject: '',
      loginUsername: '',
    },
  });

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSignIn = async (data: SignInFormData) => {
    setLoading(true);
    
    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      toast({
        title: "Ошибка входа",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Успешный вход",
        description: "Добро пожаловать в QuizIntellect!"
      });
    }
    setLoading(false);
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setLoading(true);
    
    const { error } = await signUp(
      data.email, 
      data.password, 
      data.fullName, 
      data.subject, 
      data.loginUsername
    );
    
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
            QuizIntellect
          </h1>
          <p className="text-muted-foreground">Intellect Pro School - Школа нового поколения</p>
        </div>

        <Card className="shadow-strong border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Добро пожаловать</CardTitle>
            <CardDescription>
              Войдите в систему онлайн-обучения Intellect Pro School
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Вход</TabsTrigger>
                <TabsTrigger value="signup">Регистрация</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4">
                <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                    <FormField
                      control={signInForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signInForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                      variant="default"
                    >
                      {loading ? "Вход..." : "Войти"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                    <FormField
                      control={signUpForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ФИО</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Иванов Иван Иванович"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Предмет</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Математика"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="loginUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Логин</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="ivan_teacher"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="ivan@school.com"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signUpForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Пароль</FormLabel>
                          <FormControl>
                            <Input 
                              type="password"
                              className="transition-all duration-medium focus:shadow-soft"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading}
                      variant="secondary"
                    >
                      {loading ? "Регистрация..." : "Создать аккаунт"}
                    </Button>
                  </form>
                </Form>
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