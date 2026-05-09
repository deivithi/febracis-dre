import { motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import {
  GUIDE_VIEWPORT,
  guideCardHover,
  guideItemVariants,
  guideSectionWhileInView,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { JOURNEY_STEPS, resolveJourneyStepDetail, type JourneyStepId } from './journeyContent';
import { StepCard } from './StepCard';
import { StepDetailSheet } from './StepDetailSheet';
import './JourneyTrack.css';

export interface JourneyTrackProps {
  showViewerHint?: boolean;
}

const FORMULAS_ANCHOR_ID = 'g07-formulas';
const DEMO_ANCHOR_ID = 'roteiro-demo';

export function JourneyTrack({ showViewerHint = false }: JourneyTrackProps) {
  const [detailStepId, setDetailStepId] = useState<JourneyStepId | null>(null);
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);

  const sheetStep = useMemo(() => {
    if (!detailStepId) return null;
    const base = JOURNEY_STEPS.find((s) => s.id === detailStepId);
    return base ? resolveJourneyStepDetail(base, showViewerHint) : null;
  }, [detailStepId, showViewerHint]);

  const total = JOURNEY_STEPS.length;

  const introStagger = guideStaggerContainer(0.08, rm);
  const rowStagger = guideStaggerContainer(0.15, rm);

  const connectorLineMotion = {
    initial: { scaleX: 0.35, opacity: 0.55 },
    whileInView: { scaleX: 1, opacity: [0.55, 1, 0.82, 1] },
    viewport: { once: true, amount: 0.35 },
    transition: { duration: 0.26, ease: 'easeOut' as const },
    style: { transformOrigin: 'left center' as const },
  };

  return (
    <>
      <motion.section
        id="trilha"
        className="guide-trail-section card journey-track guide-section-target"
        aria-labelledby="guide-trail-heading"
        data-guide-section="trilha"
        data-screenshot-id="guide-03"
        {...guideSectionWhileInView(rm)}
      >
        <motion.div
          className="guide-trail-section__intro"
          variants={introStagger}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
        >
          <motion.span className="badge badge--gold typo-eyebrow" variants={guideItemVariants(rm)}>
            Minicurso em 3 passos
          </motion.span>
          <motion.h2 id="guide-trail-heading" className="guide-trail-section__title typo-h2" variants={guideItemVariants(rm)}>
            Trilha do portal DRE
          </motion.h2>
          <motion.p className="guide-trail-section__lead typo-body" variants={guideItemVariants(rm)}>
            Siga a ordem: primeiro o conceito, depois a operação e, por fim, como tirar proveito das visões
            oficiais e do material de apoio.
          </motion.p>
        </motion.div>

        <motion.div
          className="journey-track__row"
          role="list"
          aria-label="Passos do minicurso"
          variants={rowStagger}
          initial="hidden"
          whileInView="visible"
          viewport={GUIDE_VIEWPORT}
        >
          {JOURNEY_STEPS.map((step, index) => (
            <motion.div key={step.id} className="journey-track__segment" role="listitem" variants={guideItemVariants(rm)}>
              {index > 0 ? (
                <div className="journey-track__connector" aria-hidden>
                  {rm ? (
                    <span className="journey-track__connector-line" />
                  ) : (
                    <motion.span className="journey-track__connector-line" {...connectorLineMotion} />
                  )}
                </div>
              ) : null}
              <motion.div
                className="journey-track__cell"
                variants={guideItemVariants(rm)}
                whileHover={rm ? undefined : guideCardHover}
                transition={{ duration: 0.15 }}
              >
                <StepCard
                  stepNumber={step.stepNumber}
                  totalSteps={total}
                  title={step.title}
                  shortDescription={step.shortDescription}
                  bullets={step.summaryBullets}
                  onLearnMore={() => setDetailStepId(step.id)}
                  formulasAnchorId={step.id === 'entender' ? FORMULAS_ANCHOR_ID : undefined}
                  demoAnchorId={step.id === 'extrair' ? DEMO_ANCHOR_ID : undefined}
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      <StepDetailSheet
        step={sheetStep}
        open={detailStepId !== null}
        onOpenChange={(o) => {
          if (!o) setDetailStepId(null);
        }}
      />
    </>
  );
}
