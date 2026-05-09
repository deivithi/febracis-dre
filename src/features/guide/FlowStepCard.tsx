export interface FlowStepCardProps {
  title: string;
  personaLabel: string;
  bullets: string[];
  imageSrc?: string;
  imageAlt?: string;
  /** Rótulo na caixa placeholder quando `imageSrc` está ausente */
  placeholderLabel: string;
}

export function FlowStepCard({
  title,
  personaLabel,
  bullets,
  imageSrc,
  imageAlt,
  placeholderLabel,
}: FlowStepCardProps) {
  return (
    <article className="guide-flow-step-card">
      <header className="guide-flow-step-card__head">
        <p className="guide-flow-step-card__persona typo-caption">{personaLabel}</p>
        <h3 className="guide-flow-step-card__title typo-h3">{title}</h3>
      </header>
      <div className="guide-flow-step-card__media">
        {imageSrc ? (
          <img src={imageSrc} alt={imageAlt ?? ''} className="guide-flow-step-card__img" loading="lazy" />
        ) : (
          <div className="guide-flow-step-card__placeholder" aria-hidden>
            <span className="typo-caption">{placeholderLabel}</span>
          </div>
        )}
      </div>
      <ul className="guide-flow-step-card__bullets typo-body-sm">
        {bullets.map((line, i) => (
          <li key={`${title}-${i}`}>{line}</li>
        ))}
      </ul>
    </article>
  );
}
