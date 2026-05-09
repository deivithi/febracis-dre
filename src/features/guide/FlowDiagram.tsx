import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowRight, BarChart3, Cpu, ShieldCheck, User } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  GUIDE_VIEWPORT,
  guideCardHover,
  guideItemVariants,
  guideSectionWhileInView,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { FlowStepCard } from './FlowStepCard';
import './FlowDiagram.css';

const FLOW_PILLARS: {
  icon: LucideIcon;
  personaName: string;
  roleLabel: string;
  action: string;
}[] = [
  {
    icon: User,
    personaName: 'Maria',
    roleLabel: 'FRANQUEADA',
    action: 'Preenche apenas as linhas editáveis da DRE — receita, deduções, despesas',
  },
  {
    icon: Cpu,
    personaName: 'Motor SQL',
    roleLabel: 'MOTOR OFICIAL',
    action: 'Recalcula MC1, MC2, EBITDA1, EBITDA2 automaticamente em SQL',
  },
  {
    icon: ShieldCheck,
    personaName: 'Carlos',
    roleLabel: 'CONTROLADORIA',
    action: 'Valida divergências, aprova ou devolve com parecer formal',
  },
  {
    icon: BarChart3,
    personaName: 'Roberto',
    roleLabel: 'HOLDING',
    action: 'Consulta o cockpit consolidado com KPIs apenas oficialmente aprovados',
  },
];

const CONNECTOR_LABELS = ['envia', 'calcula', 'aprova'] as const;

function FlowConnector({
  label,
  variant,
  reduceMotion,
}: {
  label: string;
  variant: 'horizontal' | 'vertical';
  reduceMotion: boolean;
}) {
  const Arrow = variant === 'horizontal' ? ArrowRight : ArrowDown;
  const arrowClass = 'guide-flow-connector__arrow guide-flow-connector__arrow--pulse';

  const arrowEl = reduceMotion ? (
    <Arrow className={arrowClass} size={22} strokeWidth={2} />
  ) : (
    <motion.div
      initial={{ opacity: 0.48 }}
      whileInView={{ opacity: [0.48, 1, 0.78, 1] }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.26, ease: 'easeOut' }}
    >
      <Arrow className={arrowClass} size={22} strokeWidth={2} />
    </motion.div>
  );

  return (
    <div className={`guide-flow-connector guide-flow-connector--${variant}`} aria-hidden="true">
      {arrowEl}
      <span className="guide-flow-connector__label typo-caption">{label}</span>
    </div>
  );
}

export function FlowDiagram() {
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);

  const personaStagger = guideStaggerContainer(0.15, rm);
  const cardsStagger = guideStaggerContainer(0.08, rm);

  const flowCards = [
    {
      personaLabel: 'Franqueada (Maria)',
      title: 'Submissão com trilha auditável',
      placeholderLabel: 'Submissões',
      bullets: [
        'Workflow com estados travados: rascunho, em revisão e fechamento só após governança.',
        'Edição limitada às linhas de input; totais e MC permanecem vinculados ao motor, não a digitação livre.',
        'Histórico de versões e mudanças de status registrados para auditoria interna.',
      ],
    },
    {
      personaLabel: 'Motor SQL oficial',
      title: 'Cálculo único e reprodutível',
      placeholderLabel: 'Motor (preview)',
      bullets: [
        'MC1, MC2, EBITDA1 e EBITDA2 derivados pela mesma lógica SQL em todo o tenant.',
        'Preview na submissão reflete o motor — não há “segundo cálculo” paralelo na interface.',
        'Reduz ambiguidade entre unidades: um critério técnico, múltiplas franquias.',
      ],
    },
    {
      personaLabel: 'Controladoria (Carlos)',
      title: 'Validação e parecer formal',
      placeholderLabel: 'Aprovações',
      bullets: [
        'Fila de aprovações com leitura das divergências e do contexto da submissão.',
        'Decisão explícita: aprovar ou devolver com justificativa — documento de governança.',
        'Separação de papéis: quem valida não confunde com quem apenas consome o consolidado.',
      ],
    },
    {
      personaLabel: 'Holding (Roberto)',
      title: 'Cockpit e RLS por escopo',
      placeholderLabel: 'Dashboard',
      bullets: [
        'KPIs e DRE consolidados exibem apenas o que passou por aprovação oficial.',
        'Row Level Security restringe linhas e escopos conforme perfil — sem vazamento entre unidades.',
        'Leitura executiva estável: o dashboard não é origem de edição da DRE operacional.',
      ],
    },
  ] as const;

  return (
    <motion.section
      id="fluxo-visual"
      className="guide-flow-section card guide-section-target"
      aria-labelledby="fluxo-visual-title"
      data-guide-section="fluxo-visual"
      data-screenshot-id="guide-02-flow-diagram"
      {...guideSectionWhileInView(rm)}
    >
      <div className="guide-flow-print">
        <header className="guide-flow-section__header">
          <p className="typo-eyebrow">COMO O DADO FLUI</p>
          <h2 id="fluxo-visual-title" className="guide-flow-section__title typo-h2">
            Do preenchimento à decisão executiva, em 4 movimentos auditáveis
          </h2>
        </header>

        <p className="sr-only">
          Fluxo oficial dos dados da DRE em quatro etapas horizontais, da esquerda para a direita. Maria,
          franqueada, preenche somente as linhas editáveis da DRE. Os valores seguem para o motor SQL, que
          recalcula MC1, MC2, EBITDA1 e EBITDA2. Carlos, na controladoria, valida divergências e aprova ou
          devolve com parecer. Roberto, na holding, consulta o cockpit consolidado com indicadores já aprovados.
          Entre Maria e o motor há o envio; entre o motor e a controladoria, o cálculo automático; entre
          controladoria e holding, a aprovação formal. A etapa final é a consulta executiva aos KPIs oficiais.
        </p>

        <div className="guide-flow-diagram" aria-hidden="true">
          <motion.ol
            className="guide-flow-diagram__track"
            variants={personaStagger}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            {FLOW_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              const isLast = index === FLOW_PILLARS.length - 1;
              return (
                <motion.li key={pillar.personaName} className="guide-flow-diagram__slot" variants={guideItemVariants(rm)}>
                  <div className="guide-flow-pillar">
                    <div className="guide-flow-pillar__avatar" aria-hidden>
                      <Icon size={26} strokeWidth={1.75} className="guide-flow-pillar__icon" />
                    </div>
                    <p className="guide-flow-pillar__name typo-h4">{pillar.personaName}</p>
                    <p className="guide-flow-pillar__role typo-caption">{pillar.roleLabel}</p>
                    <p className="guide-flow-pillar__action typo-body-sm">{pillar.action}</p>
                    {isLast ? (
                      <p className="guide-flow-pillar__consulta">
                        <span className="guide-flow-pillar__consulta-label">consulta</span>
                        <span className="guide-flow-pillar__consulta-hint">leitura executiva do consolidado</span>
                      </p>
                    ) : null}
                  </div>
                  {!isLast ? (
                    <FlowConnector label={CONNECTOR_LABELS[index]} variant="horizontal" reduceMotion={rm} />
                  ) : null}
                </motion.li>
              );
            })}
          </motion.ol>

          <motion.div
            className="guide-flow-diagram__mobile"
            variants={personaStagger}
            initial="hidden"
            whileInView="visible"
            viewport={GUIDE_VIEWPORT}
          >
            {FLOW_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              const isLast = index === FLOW_PILLARS.length - 1;
              return (
                <motion.div key={`m-${pillar.personaName}`} className="guide-flow-diagram__mobile-block" variants={guideItemVariants(rm)}>
                  <div className="guide-flow-pillar guide-flow-pillar--mobile">
                    <div className="guide-flow-pillar__avatar" aria-hidden>
                      <Icon size={26} strokeWidth={1.75} className="guide-flow-pillar__icon" />
                    </div>
                    <p className="guide-flow-pillar__name typo-h4">{pillar.personaName}</p>
                    <p className="guide-flow-pillar__role typo-caption">{pillar.roleLabel}</p>
                    <p className="guide-flow-pillar__action typo-body-sm">{pillar.action}</p>
                    {isLast ? (
                      <p className="guide-flow-pillar__consulta">
                        <span className="guide-flow-pillar__consulta-label">consulta</span>
                        <span className="guide-flow-pillar__consulta-hint">leitura executiva do consolidado</span>
                      </p>
                    ) : null}
                  </div>
                  {!isLast ? (
                    <FlowConnector label={CONNECTOR_LABELS[index]} variant="vertical" reduceMotion={rm} />
                  ) : null}
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <motion.div
          className="guide-flow-cards"
          variants={cardsStagger}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
        >
          {flowCards.map((card) => (
            <motion.div key={card.title} variants={guideItemVariants(rm)} whileHover={rm ? undefined : guideCardHover}>
              <FlowStepCard
                personaLabel={card.personaLabel}
                title={card.title}
                placeholderLabel={card.placeholderLabel}
                bullets={[...card.bullets]}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
