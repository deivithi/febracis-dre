import { motion, useReducedMotion } from 'framer-motion';
import { BarChart3, ClipboardCheck, Network, ShieldCheck, Sparkles } from 'lucide-react';
import {
  GUIDE_VIEWPORT,
  guideItemVariants,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { PillarCard } from './PillarCard';
import { PLATFORM_PILLARS_METADATA } from './platformPillarsCopy';

const PILLAR_ICONS = [Network, ClipboardCheck, Sparkles, ShieldCheck, BarChart3] as const;

const PILLARS = PLATFORM_PILLARS_METADATA.map((pillar, index) => ({
  ...pillar,
  icon: PILLAR_ICONS[index],
}));

export function PlatformPillars() {
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);

  const sectionOuter = guideStaggerContainer(0.06, rm);
  const gridInner = guideStaggerContainer(0.08, rm);

  return (
    <motion.section
      id="pilares-plataforma"
      data-guide-section="pilares-plataforma"
      className="guide-pillars-section guide-section-target"
      aria-labelledby="pilares-plataforma-title"
      data-screenshot-id="guide-04"
      variants={sectionOuter}
      initial="hidden"
      whileInView="visible"
      viewport={GUIDE_VIEWPORT}
    >
      <motion.p className="guide-pillars-section__eyebrow typo-eyebrow" variants={guideItemVariants(rm)}>
        O QUE A PLATAFORMA GARANTE
      </motion.p>
      <motion.h2
        id="pilares-plataforma-title"
        className="guide-pillars-section__heading typo-h2"
        variants={guideItemVariants(rm)}
      >
        Cinco pilares que sustentam a operação da rede
      </motion.h2>
      <h3 className="sr-only">Detalhe por pilar</h3>
      <motion.div className="guide-pillars-grid" variants={gridInner}>
        {PILLARS.map((pillar) => (
          <PillarCard
            key={pillar.title}
            icon={pillar.icon}
            title={pillar.title}
            businessBenefit={pillar.businessBenefit}
            variants={guideItemVariants(rm)}
          />
        ))}
      </motion.div>
    </motion.section>
  );
}
