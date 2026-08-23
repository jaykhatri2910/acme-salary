import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../components/ui/card';

import { ThemeToggle } from '../components/ThemeToggle';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFields = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const { setAuth, accessToken, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = location.state?.from?.pathname || '/';

  React.useEffect(() => {
    if (accessToken && user) {
      navigate(from, { replace: true });
    }
  }, [accessToken, user, navigate, from]);

  const onSubmit = async (data: LoginFields) => {
    setApiError(null);
    try {
      const res = await api.post('/auth/login', {
        email: data.email,
        password: data.password,
      });

      const { accessToken, user } = res.data.data;
      setAuth(accessToken, user);
      navigate(from, { replace: true });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.message || 'An unexpected error occurred';
      setApiError(errorMessage);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border bg-card shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">Sign in</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">
            Enter your HR manager credentials to access the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {apiError ? (
              <div className="flex items-center space-x-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{apiError}</span>
              </div>
            ) : null}

            <div className="space-y-1 text-left">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@acme.com"
                  className="pl-9"
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
              ) : null}
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
              Sign In
            </Button>
            
            {isSubmitting && (
              <p className="text-xs text-center text-muted-foreground mt-4 animate-pulse">
                Waking up the server... This might take up to 50 seconds on the free tier.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
