import { ClipboardCheck } from 'lucide-react';
import { Fragment, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useIsNarrowMax1023 } from '../../hooks/useMediaQuery';
import { DemoStep } from './DemoStep';
import {
  DEMO_ROADMAP_CTA_LABEL,
  DEMO_ROADMAP_STEP_TOTAL,
  demoPresentationSteps,
} from './guide-data';
import { GuidedPresentationCta } from './GuidedDemoMode';
import './DemoRoadmap.css';

const DOTS_PER_SEGMENT = 7;

function TimelineConnectorSegment({
  segmentIndex,
  inView,
  reducedMotion,
  vertical,
}: {
  segmentIndex: number;
  inView: boolean;
  reducedMotion: boolean;
  vertical: boolean;
}) {
  return (
    <div
      className={
        vertical
          ? 'demo-roadmap__connector demo-roadmap__connector--vertical'
          : 'demo-roadmap__connector demo-roadmap__connector--horizontal'
      }
      aria-hidden
    >
      <span className="demo-roadmap__connector-track" />
      <span className="demo-roadmap__connector-dots">
        {Array.from({ length: DOTS_PER_SEGMENT }).map((_, dotIndex) => (
          <motion.span
            key={dotIndex}
            className="demo-roadmap__connector-dot"
            initial={false}
            animate={
              reducedMotion
                ? { opacity: 1, scale: 1 }
                : inView
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0.2, scale: 0.75 }
            }
            transition={{
              delay: reducedMotion ? 0 : segmentIndex * 0.2 + dotIndex * 0.05,
              duration: 0.32,
              ease: 'easeOut',
            }}
          />
        ))}
      </span>
    </div>
  );
}

export function DemoRoadmap() {
  const narrow = useIsNarrowMax1023();
  const rm = Boolean(useReducedMotion());
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = Boolean(useInView(rootRef, { amount: 0.15, once: true }));

  const steps = demoPresentationSteps;
  const total = DEMO_ROADMAP_STEP_TOTAL;

  return (
    <section
      id="roteiro-demo"
      ref={rootRef}
      className="card demo-roadmap guide-section-target"
      aria-labelledby="roteiro-demo-title"
      data-guide-section="roteiro-demo"
      data-screenshot-id="guide-07"
    >
      <div className="card__header demo-roadmap__header">
        <div className="demo-roadmap__header-copy">
          <p className="demo-roadmap__eyebrow typo-eyebrow">COMO APRESENTAR O PRODUTO</p>
          <div className="demo-roadmap__title-row">
            <h2 id="roteiro-demo-title" className="card__title demo-roadmap__title typo-h2">
              Cinco minutos. Cinco telas. O ciclo completo.
            </h2>
            <span className="demo-roadmap__time-badge typo-caption" aria-label="Duração estimada: cerca de 5 minutos">
              ~5 min
            </span>
          </div>
          <p className="demo-roadmap__subtitle typo-body-sm">
            Roteiro recomendado para apresentar a plataforma a uma diretoria ou board.
          </p>
          <div className="demo-roadmap__primary-cta">
            <GuidedPresentationCta />
          </div>
        </div>
        <ClipboardCheck size={18} aria-hidden className="demo-roadmap__header-icon" />
      </div>

      <div className="card__body demo-roadmap__body">
        {!narrow ? (
          <div className="demo-roadmap__desktop" aria-label="Roteiro em linha do tempo horizontal">
            <div className="demo-roadmap__nodes-row">
              {steps.map((step, index) => (
                <Fragment key={step.step}>
                  <div className="demo-roadmap__node-col">
                    <motion.div
                      className="demo-roadmap__circle"
                      initial={false}
                      animate={
                        rm
                          ? {}
                          : inView
                            ? { opacity: 1, scale: 1 }
                            : { opacity: 0.6, scale: 0.92 }
                      }
                      transition={{
                        delay: rm ? 0 : index * 0.12,
                        duration: 0.35,
                      }}
                    >
                      <span className="demo-roadmap__circle-num">{step.step}</span>
                    </motion.div>
                  </div>
                  {index < steps.length - 1 ? (
                    <TimelineConnectorSegment
                      segmentIndex={index}
                      inView={inView}
                      reducedMotion={rm}
                      vertical={false}
                    />
                  ) : null}
                </Fragment>
              ))}
            </div>
            <div className="demo-roadmap__cards-row">
              {steps.map((step) => (
                <div key={step.step} className="demo-roadmap__card-cell">
                  <DemoStep
                    step={step.step}
                    eyebrow={`PASSO ${step.step} DE ${total}`}
                    title={step.title}
                    description={step.description}
                    href={step.href}
                    ctaLabel={DEMO_ROADMAP_CTA_LABEL}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <ol className="demo-roadmap__mobile" aria-label="Roteiro em linha do tempo vertical">
            {steps.map((step, index) => (
              <li key={step.step} className="demo-roadmap__mobile-item">
                <div className="demo-roadmap__mobile-rail">
                  <motion.div
                    className="demo-roadmap__circle"
                    initial={false}
                    animate={
                      rm
                        ? {}
                        : inView
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0.6, scale: 0.92 }
                    }
                    transition={{
                      delay: rm ? 0 : index * 0.12,
                      duration: 0.35,
                    }}
                  >
                    <span className="demo-roadmap__circle-num">{step.step}</span>
                  </motion.div>
                  {index < steps.length - 1 ? (
                    <TimelineConnectorSegment
                      segmentIndex={index}
                      inView={inView}
                      reducedMotion={rm}
                      vertical
                    />
                  ) : null}
                </div>
                <DemoStep
                  step={step.step}
                  eyebrow={`PASSO ${step.step} DE ${total}`}
                  title={step.title}
                  description={step.description}
                  href={step.href}
                  ctaLabel={DEMO_ROADMAP_CTA_LABEL}
                />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
