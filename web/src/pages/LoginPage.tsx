import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { api, isAppError } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import type { ApiResponse, LoginResponse } from '@/types';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email khu00f4ng u0111u01b0u1ee3c u0111u1ec3 tru1ed1ng')
    .email('Email khu00f4ng u0111u00fang u0111u1ecbnh du1ea1ng'),
  password: z
    .string()
    .min(6, 'Mu1eadt khu1ea9u tu1ed1i thiu1ec3u 6 ku00fd tu1ef1'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(data: LoginFormData): Promise<void> {
    setIsLoading(true);
    setServerError(null);

    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        '/auth/login',
        data,
      );

      const payload = response.data.data;
      if (!payload) throw new Error('Invalid response');

      login(payload);
      toast.success('u0110u0103ng nhu1eadp thu00e0nh cu00f4ng!');
      navigate('/', { replace: true });
    } catch (error: unknown) {
      if (isAppError(error)) {
        setServerError(error.message);
      } else {
        setServerError('u0110u0103ng nhu1eadp thu1ea5t bu1ea1i. Vui lu00f2ng thu1eed lu1ea1i.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-500 mb-4 shadow-md">
            <Activity className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-950 text-center">
            Smart Attendance
          </h1>
          <p className="text-sm text-neutral-500 mt-1 text-center">
            Hu1ec7 thu1ed1ng chu1ea5m cu00f4ng thu00f4ng minh
          </p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-semibold text-neutral-950 mb-6">
            u0110u0103ng nhu1eadp
          </h2>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                className={cn(
                  'input',
                  errors.email && 'ring-2 ring-danger-base border-danger-base',
                )}
                placeholder="admin@hdbank.vn"
                {...register('email')}
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
              />
              {errors.email && (
                <p id="email-error" className="field-error" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="label">
                Mu1eadt khu1ea9u
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(
                    'input pr-10',
                    errors.password &&
                      'ring-2 ring-danger-base border-danger-base',
                  )}
                  placeholder="u2022u2022u2022u2022u2022u2022u2022u2022"
                  {...register('password')}
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                  aria-label={showPassword ? 'u1ea8n mu1eadt khu1ea9u' : 'Hiu1ec3n mu1eadt khu1ea9u'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="field-error" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div
                className="flex items-center gap-2 p-3 bg-danger-bg border border-danger-base/20 rounded-lg"
                role="alert"
                aria-live="assertive"
              >
                <p className="text-sm text-danger-text">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full h-10 mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  u0110ang u0111u0103ng nhu1eadp...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  u0110u0103ng nhu1eadp
                </span>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Smart Attendance V2 u00b7 Giu1ea3i Phu00e1p Su1ed1
        </p>
      </div>
    </div>
  );
}
