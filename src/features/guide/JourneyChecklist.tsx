import { motion, useReducedMotion } from 'framer-motion';
import {
  GUIDE_VIEWPORT,
  guideItemVariants,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { CheckCircle } from 'lucide-react';

export interface JourneyChecklistProps {
  steps: { title: string; subtitle: string }[];
}

export function JourneyChecklist({ steps }: JourneyChecklistProps) {
  const rm = Boolean(useReducedMotion());
  const listStagger = guideStaggerContainer(0.06, rm);

  return (
    <motion.ul
      className="journey-checklist"
      aria-label="Etapas da jornada"
      variants={listStagger}
      initial="hidden"
      whileInView="visible"
      viewport={GUIDE_VIEWPORT}
    >
      {steps.map((step, i) => (
        <motion.li key={i} className="journey-checklist__step" variants={guideItemVariants(rm)}>
          <div className="journey-checklist__row">
            <CheckCircle className="journey-checklist__icon text-success" size={16} strokeWidth={2} aria-hidden />
            <div className="journey-checklist__text">
              <p className="journey-checklist__title typo-body-sm weight-medium">{step.title}</p>
              <p className="journey-checklist__subtitle typo-caption line-clamp-1">{step.subtitle}</p>
            </div>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}
