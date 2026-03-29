export interface GuideDemoScriptStep {
  stepNumber: number;
  title: string;
  description: string;
}

interface GuideDemoScriptTrailProps {
  steps: GuideDemoScriptStep[];
}

export function GuideDemoScriptTrail({ steps }: GuideDemoScriptTrailProps) {
  const total = steps.length;

  return (
    <ol className="guide-trail guide-trail--demo" aria-label="Passos do roteiro de demonstração">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const variant = index % 2 === 0 ? 'blue' : 'gold';
        const stepLabel = `Passo ${step.stepNumber} de ${total}`;

        return (
          <li
            key={step.stepNumber}
            className={`guide-trail__item guide-trail__item--${variant} guide-trail__item--demo`}
          >
            <div className="guide-trail__rail">
              <span className="guide-trail__node guide-trail__node--demo">
                <span className="guide-trail__node-number">{step.stepNumber}</span>
              </span>
              {!isLast ? <span className="guide-trail__rail-line guide-trail__rail-line--demo" aria-hidden /> : null}
            </div>

            <article className="guide-trail__card guide-trail__card--demo">
              <p className="guide-trail__step-label">{stepLabel}</p>
              <h3 className="guide-trail__card-title guide-trail__card-title--demo">{step.title}</h3>
              <p className="guide-demo-script__description">{step.description}</p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
