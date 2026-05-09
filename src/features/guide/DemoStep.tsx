import { Link } from 'react-router-dom';

export interface DemoStepProps {
  step: number;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
}

function destinationSummary(href: string): string {
  switch (href) {
    case '/app/dashboard':
      return 'Dashboard';
    case '/app/admin':
      return 'Configurações';
    case '/app/submissions':
      return 'Submissões';
    case '/app/workflow':
      return 'Aprovações';
    default:
      return href;
  }
}

export function DemoStep({ step, eyebrow, title, description, href, ctaLabel }: DemoStepProps) {
  const dest = destinationSummary(href);
  const ariaLabel = `${ctaLabel.replace(/\s*→\s*$/, '').trim()} — ${title} — destino: ${dest}`;

  return (
    <article className="demo-step" data-demo-step={step}>
      <p className="demo-step__eyebrow typo-caption">{eyebrow}</p>
      <h3 className="demo-step__title typo-h3">{title}</h3>
      <p className="demo-step__description typo-body-sm">{description}</p>
      <Link to={href} className="demo-step__cta" aria-label={ariaLabel}>
        {ctaLabel}
      </Link>
    </article>
  );
}
