import type { LucideIcon } from 'lucide-react';
import { BookOpenText, Building2, Eye } from 'lucide-react';

export type GuideTrailVariant = 'gold' | 'blue';

export interface GuideLearningTrailStep {
  id: string;
  stepNumber: number;
  title: string;
  outcome: string;
  bullets: string[];
  icon: LucideIcon;
  variant: GuideTrailVariant;
}

const BASE_TRAIL: GuideLearningTrailStep[] = [
  {
    id: 'entender',
    stepNumber: 1,
    title: 'Entender o fluxo do dado',
    outcome:
      'Você posiciona o portal: a DRE nasce na unidade, é recalculada no servidor e só então vira leitura executiva.',
    bullets: [
      'Submissões: a franquia informa apenas as linhas de input; MC1, MC2 e EBITDA são recalculados pelo motor (SQL), não digitados à mão no dashboard.',
      'Controladoria valida no workflow: aprovar, devolver para ajuste ou acompanhar histórico — cada mudança de status fica auditável.',
      'O dashboard é a ponta final: mostra consolidado oficial por escopo, depois que o ciclo passou pela governança.',
      'Fórmulas detalhadas: seção Lógica da DRE (âncora abaixo).',
    ],
    icon: BookOpenText,
    variant: 'blue',
  },
  {
    id: 'operar',
    stepNumber: 2,
    title: 'Operar no dia a dia',
    outcome:
      'Você sabe qual tela usar e como o assistente se comporta conforme o seu papel.',
    bullets: [
      'Franqueado (ou admin da unidade): Submissões → coligada, competência e evento → preencher linhas, preview ao vivo, salvar rascunho e enviar para revisão.',
      'Controladoria: fila em Aprovações → analisar DRE, validações e histórico → aprovar ou devolver com justificativa.',
      'Assistente DRE: quem opera a submissão pode receber sugestões que gravam campos; quem está só em leitura usa modo orientação (sem aplicar valores).',
    ],
    icon: Building2,
    variant: 'gold',
  },
  {
    id: 'extrair',
    stepNumber: 3,
    title: 'Extrair o melhor da plataforma',
    outcome:
      'Você usa o dashboard e este Guia como referência estável — e tem um roteiro pronto para apresentar o produto.',
    bullets: [
      'Dashboard: KPIs, DRE e status alinhados ao que foi validado; não é origem de edição da DRE.',
      'Guia: volte aqui para explicar papéis, jornadas e fórmulas em qualquer onboarding interno.',
      'Apresentação: siga o checklist do roteiro de demo na ordem sugerida (seção abaixo).',
    ],
    icon: Eye,
    variant: 'blue',
  },
];

function buildTrailSteps(showViewerHint: boolean): GuideLearningTrailStep[] {
  const steps = BASE_TRAIL.map((s) =>
    s.id === 'operar'
      ? {
          ...s,
          bullets: showViewerHint
            ? [
                'No perfil viewer: use o Dashboard e este Guia; Submissões e módulos operacionais não aparecem no menu — URLs diretas mostram acesso restrito.',
                ...s.bullets,
              ]
            : s.bullets,
        }
      : s,
  );
  return steps;
}

interface GuideLearningTrailProps {
  showViewerHint?: boolean;
}

export function GuideLearningTrail({ showViewerHint = false }: GuideLearningTrailProps) {
  const steps = buildTrailSteps(showViewerHint);
  const total = steps.length;

  return (
    <section
      id="trilha"
      className="guide-trail-section card"
      aria-labelledby="guide-trail-heading"
    >
      <div className="guide-trail-section__intro">
        <span className="badge badge--gold">Minicurso em 3 passos</span>
        <h2 id="guide-trail-heading" className="guide-trail-section__title">
          Trilha do portal DRE
        </h2>
        <p className="guide-trail-section__lead">
          Siga a ordem: primeiro o conceito, depois a operação e, por fim, como tirar proveito das visões
          oficiais e do material de apoio.
        </p>
      </div>

      <ol className="guide-trail" aria-label="Passos do minicurso">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          const stepLabel = `Passo ${step.stepNumber} de ${total}`;
          return (
            <li
              key={step.id}
              className={`guide-trail__item guide-trail__item--${step.variant}`}
            >
              <div className="guide-trail__rail">
                <span className="guide-trail__node">
                  <span className="guide-trail__node-number">{step.stepNumber}</span>
                </span>
                {!isLast ? <span className="guide-trail__rail-line" aria-hidden="true" /> : null}
              </div>

              <article className="guide-trail__card">
                <div className="guide-trail__card-head">
                  <div className={`guide-trail__icon guide-trail__icon--${step.variant}`}>
                    <Icon size={22} aria-hidden />
                  </div>
                  <div>
                    <p className="guide-trail__step-label">{stepLabel}</p>
                    <h3 className="guide-trail__card-title">{step.title}</h3>
                  </div>
                </div>
                <p className="guide-trail__outcome">{step.outcome}</p>
                <ul className="guide-trail__bullets">
                  {step.bullets.map((line, bulletIndex) => (
                    <li key={`${step.id}-${bulletIndex}`}>{line}</li>
                  ))}
                </ul>
                {step.id === 'entender' ? (
                  <p className="guide-trail__anchor-hint">
                    <a href="#logica-dre">Abrir Lógica da DRE (fórmulas)</a>
                  </p>
                ) : null}
                {step.id === 'extrair' ? (
                  <p className="guide-trail__anchor-hint">
                    <a href="#roteiro-demo">Abrir roteiro de demo</a>
                  </p>
                ) : null}
              </article>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
