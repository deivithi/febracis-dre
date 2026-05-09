import type { HTMLMotionProps } from 'framer-motion';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export type PillarCardProps = {
  icon: LucideIcon;
  title: string;
  businessBenefit: string;
} & Omit<HTMLMotionProps<'article'>, 'children'>;

/** Cartão informativo de pilar — sem CTA/links. Estilos em GuidePage.css (`.guide-pillar-card`). */
export function PillarCard({ icon: Icon, title, businessBenefit, ...motionProps }: PillarCardProps) {
  return (
    <motion.article className="guide-pillar-card" {...motionProps}>
      <div className="guide-pillar-card__icon-wrap" aria-hidden>
        <Icon size={32} strokeWidth={1.75} className="guide-pillar-card__icon" />
      </div>
      <h4 className="guide-pillar-card__title typo-h4">{title}</h4>
      <p className="guide-pillar-card__benefit typo-body-sm">{businessBenefit}</p>
    </motion.article>
  );
}
