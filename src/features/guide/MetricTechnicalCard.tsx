import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';

type FormulaVariant = 'gold' | 'blue';

export type MetricTechnicalCardProps = {
  label: string;
  expression: string;
  variant: FormulaVariant;
} & Omit<HTMLMotionProps<'div'>, 'children'>;

export function MetricTechnicalCard({ label, expression, variant, ...motionProps }: MetricTechnicalCardProps) {
  return (
    <motion.div className={`guide-formulas__item guide-formulas__item--${variant}`} {...motionProps}>
      <div className="guide-formulas__label typo-caption">{label}</div>
      <code className="guide-formulas__code typo-mono">
        {label} = {expression}
      </code>
    </motion.div>
  );
}
