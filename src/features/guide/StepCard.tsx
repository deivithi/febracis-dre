import { Check } from 'lucide-react';

export interface StepCardProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  shortDescription: string;
  bullets: string[];
  onLearnMore: () => void;
  /** Link para a página de lógica da DRE (passo 1). */
  formulasHref?: string;
  /** Link para o roteiro de demo (passo 3). */
  demoHref?: string;
}

export function StepCard({
  stepNumber,
  totalSteps,
  title,
  shortDescription,
  bullets,
  onLearnMore,
  formulasHref,
  demoHref,
}: StepCardProps) {
  const eyebrow = `Passo ${stepNumber} de ${totalSteps}`;

  return (
    <article className="journey-step-card">
      <div className="journey-step-card__top">
        <span className="journey-step-card__badge" aria-hidden>
          <span className="journey-step-card__badge-num typo-mono">{stepNumber}</span>
        </span>
        <div className="journey-step-card__headings">
          <p className="journey-step-card__eyebrow typo-caption">{eyebrow}</p>
          <h3 className="journey-step-card__title typo-h3">{title}</h3>
        </div>
      </div>

      <p className="journey-step-card__desc typo-body-sm">{shortDescription}</p>

      <ul className="journey-step-card__bullets typo-body-sm">
        {bullets.map((line, i) => (
          <li key={i} className="journey-step-card__bullet">
            <Check className="journey-step-card__check" size={12} strokeWidth={2.5} aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="journey-step-card__actions">
        <button type="button" className="journey-step-card__cta typo-body-sm" onClick={onLearnMore}>
          Saiba mais →
        </button>
        {formulasHref ? (
          <a href={formulasHref} className="journey-step-card__anchor typo-body-sm">
            Abrir Lógica da DRE (fórmulas)
          </a>
        ) : null}
        {demoHref ? (
          <a href={demoHref} className="journey-step-card__anchor typo-body-sm">
            Abrir roteiro de demo
          </a>
        ) : null}
      </div>
    </article>
  );
}
