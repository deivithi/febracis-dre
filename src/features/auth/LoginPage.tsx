import { useEffect, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from './useAuth';
import './LoginPage.css';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const proofPoints = [
  { value: '+33', label: 'unidades no ecossistema Febracis', icon: Building2 },
  { value: '+1.300', label: 'colaboradores na operação global', icon: ShieldCheck },
  { value: '+400 mil', label: 'clientes de coaching no grupo', icon: BarChart3 },
];

const journey = [
  'A franquia informa a DRE da competência e do evento.',
  'A controladoria valida, pede ajuste ou aprova o envio.',
  'O dashboard sobe apenas a visão oficial consolidada.',
];

const logoPath = `${import.meta.env.BASE_URL}images/logo-febracis.png`;
const metodoCisBackground = `${import.meta.env.BASE_URL}images/bg-metodo-cis-2025.webp`;
const mandalaImage = `${import.meta.env.BASE_URL}images/mandala-febracis.png`;
const loginBackgroundStyle = {
  '--login-hero-image': `url(${metodoCisBackground})`,
} as CSSProperties;

export function LoginPage() {
  const { session, signIn, supabaseMisconfigured } = useAuth();
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

  useEffect(() => {
    if (session) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [navigate, session]);

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
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" style={loginBackgroundStyle} />

      <div className="login-page__mesh" />

      <section className="login-page__story animate-fade-in">
        <div
          className="login-page__story-atmosphere"
          style={{ backgroundImage: `url(${mandalaImage})` }}
          aria-hidden="true"
        />
        <div className="login-page__story-inner">
          <div className="login-page__brand-row">
            <img src={logoPath} alt="Febracis" className="login-page__brand-logo" />
            <div className="login-page__brand-copy">
              <div className="login-page__brand-line">
                <span className="login-page__brand-mark">Febracis</span>
                <span className="login-page__brand-line-separator" />
                <div className="login-page__brand-name">Portal Gerencial de Resultado</div>
              </div>
              <div className="login-page__brand-sub">
                DRE centralizada por franquia, competência e workflow
              </div>
            </div>
          </div>

          <span className="badge badge--gold login-page__eyebrow">
            Febracis premium dark • governança financeira
          </span>

          <h1 className="login-page__headline">
            O resultado da rede nasce na DRE da unidade e sobe para a liderança com
            governança.
          </h1>

          <p className="login-page__description">
            Este portal organiza a coleta financeira das franquias, calcula MC1, MC2 e EBITDA,
            sustenta a revisão da controladoria e entrega a leitura executiva consolidada.
          </p>

          <div className="login-page__proof-grid">
            {proofPoints.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="login-page__proof">
                  <div className="login-page__proof-icon">
                    <Icon size={18} />
                  </div>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              );
            })}
          </div>

          <div className="login-page__journey">
            <div className="login-page__journey-header">
              <span className="badge badge--primary">Como a plataforma funciona</span>
            </div>
            <div className="login-page__journey-steps">
              {journey.map((step, index) => (
                <div key={step} className="login-page__journey-step">
                  <span className="login-page__journey-index">0{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="login-page__panel animate-fade-in-up">
        <div className="login-page__panel-card glass-strong">
          {supabaseMisconfigured ? (
            <div className="login-page__alert login-page__alert--blocking" role="alert">
              <AlertCircle size={16} />
              <div>
                <strong>Configuração incompleta</strong>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {supabaseMisconfigured.message}
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                  {supabaseMisconfigured.hint}
                </p>
              </div>
            </div>
          ) : null}
          <div className="login-page__panel-header">
            <span className="badge badge--gold">Acesso ao portal</span>
            <h2 className="login-page__form-title">Entrar para operar ou validar</h2>
            <p className="login-page__form-subtitle">
              Franquias enviam, controladoria revisa e a liderança acompanha a visão consolidada.
            </p>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="login-page__form"
            aria-disabled={Boolean(supabaseMisconfigured)}
          >
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
                data-testid="login-email"
                type="email"
                className={`form-input ${errors.email ? 'form-input--error' : ''}`}
                placeholder="seu@email.com"
                autoComplete="email"
                {...register('email')}
                disabled={Boolean(supabaseMisconfigured)}
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
                  data-testid="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'form-input--error' : ''}`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                  disabled={Boolean(supabaseMisconfigured)}
                />
                <button
                  type="button"
                  className="login-page__toggle-password"
                  onClick={() => setShowPassword((current) => !current)}
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
              data-testid="login-submit"
              className={`btn btn--gold btn--lg btn--full ${isSubmitting ? 'btn--loading' : ''}`}
              disabled={isSubmitting || Boolean(supabaseMisconfigured)}
            >
              {isSubmitting ? (
                <>
                  <span className="btn__spinner" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Entrar no portal
                </>
              )}
            </button>
          </form>

          <div className="login-page__panel-footer">
            <div className="login-page__panel-note">
              <span className="badge badge--primary">Fluxo visível na demo</span>
              <p>
                Login, dashboard executivo, fila de revisão e ambiente de demonstração resetável
                no painel de configurações.
              </p>
            </div>
            <button
              type="button"
              className="login-page__inline-link"
              onClick={() => navigate('/app/dashboard')}
            >
              Já está autenticado? Ir para o portal <ArrowRight size={16} />
            </button>
          </div>

          <div className="login-page__footer">
            <p className="login-page__footer-text">
              © {new Date().getFullYear()} Febracis Coaching Integral Sistêmico
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
