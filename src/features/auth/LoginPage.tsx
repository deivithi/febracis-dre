import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from './useAuth';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    const redirectTo =
      typeof location.state === 'object' &&
      location.state !== null &&
      'from' in location.state &&
      typeof location.state.from === 'object' &&
      location.state.from !== null &&
      'pathname' in location.state.from &&
      typeof location.state.from.pathname === 'string'
        ? location.state.from.pathname
        : '/app/dashboard';

    setIsSubmitting(true);
    setAuthError(null);

    const { error } = await signIn(data.email, data.password);

    if (error) {
      setAuthError('E-mail ou senha incorretos. Tente novamente.');
      setIsSubmitting(false);
    } else {
      navigate(redirectTo, { replace: true });
    }
  };

  return (
    <div className="login-page">
      {/* Background gradient */}
      <div className="login-page__bg" />

      {/* Left side — Branding */}
      <div className="login-page__branding">
        <div className="login-page__branding-content animate-fade-in">
          <div className="login-page__logo">
            <span className="login-page__logo-text">FEBRACIS</span>
            <span className="login-page__logo-sub">Sistema Gerencial de Resultado</span>
          </div>
          <h1 className="login-page__headline">
            Gestão financeira <br />
            <span className="login-page__headline-accent">de alto impacto</span>
          </h1>
          <p className="login-page__description">
            Controle a DRE de cada franquia com precisão,
            transparência e segurança.
          </p>
        </div>
      </div>

      {/* Right side — Login Form */}
      <div className="login-page__form-section">
        <div className="login-page__form-container animate-fade-in-up">
          <div className="login-page__form-header">
            <h2 className="login-page__form-title">Entrar</h2>
            <p className="login-page__form-subtitle">
              Acesse o portal gerencial da sua franquia
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="login-page__form">
            {authError && (
              <div className="login-page__alert">
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="seu@email.com"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <span className="form-error">
                  <AlertCircle size={12} />
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Senha
              </label>
              <div className="input-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="login-page__toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="form-error">
                  <AlertCircle size={12} />
                  {errors.password.message}
                </span>
              )}
            </div>

            <button
              type="submit"
              className={`btn btn--gold btn--lg btn--full ${isSubmitting ? 'btn--loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="btn__spinner" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Entrar
                </>
              )}
            </button>
          </form>

          <div className="login-page__footer">
            <p className="login-page__footer-text">
              © {new Date().getFullYear()} Febracis Coaching Integral Sistêmico
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
