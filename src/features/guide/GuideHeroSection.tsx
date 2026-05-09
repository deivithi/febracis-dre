/**
 * G01 — Hero do Guia (`/app/guide`).
 * [Não verificado — revisão marca] Copy pode precisar de aprovação de marketing antes de produção.
 *
 * Tour “trilha guiada”: usa `startTour` (Shepherd) já existente — não há tour U20 dedicado só ao Guia no repositório.
 */
import type { NavigateFunction } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, PlayCircle, Users, Workflow } from 'lucide-react';
import type { AccessProfile } from '../auth/auth.types';
import {
  GUIDE_VIEWPORT,
  guideItemVariants,
  guidePrimaryCtaHoverTap,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { startTour } from '../tour/Tour';
import { TooltipContent, TooltipRoot, TooltipTrigger } from '../../components/ui/tooltip';

export interface GuideHeroSectionProps {
  accessProfile: AccessProfile | undefined;
  navigate: NavigateFunction;
  pathname: string;
}

export function GuideHeroSection({ accessProfile, navigate, pathname }: GuideHeroSectionProps) {
  const tourReady = Boolean(accessProfile);
  const rm = Boolean(useReducedMotion());
  const heroStagger = guideStaggerContainer(0.1, rm);

  const onStartTour = () => {
    if (!accessProfile) return;
    startTour({
      accessProfile,
      navigate,
      pathname,
      persistOnFinish: false,
      role: accessProfile.primaryRole?.code ?? 'viewer',
    });
  };

  return (
    <section
      id="hero"
      className="guide-hero-g01 card card--gold guide-section-target"
      aria-labelledby="guide-hero-heading"
      data-guide-section="hero"
      data-screenshot-id="guide-01"
      style={{
        backgroundImage:
          'radial-gradient(circle at top right, color-mix(in srgb, var(--primary-gold, var(--accent-gold)) 5%, transparent) 0%, transparent 40%)',
      }}
    >
      <motion.div
        className="guide-hero-g01__inner"
        variants={heroStagger}
        initial="hidden"
        whileInView="visible"
        viewport={GUIDE_VIEWPORT}
      >
        <motion.p className="guide-hero-g01__eyebrow typo-eyebrow" variants={guideItemVariants(rm)}>
          PORTAL GERENCIAL DRE FEBRACIS
        </motion.p>
        <motion.h1
          id="guide-hero-heading"
          className="guide-hero-g01__headline typo-display"
          variants={guideItemVariants(rm)}
        >
          A DRE da rede Febracis nasce padronizada, calculada pelo motor oficial e chega ao executivo já validada.
        </motion.h1>
        <motion.p className="guide-hero-g01__subhead typo-body-lg" variants={guideItemVariants(rm)}>
          Franqueada preenche apenas o necessário. Controladoria valida com governança. Holding lê apenas o que foi
          aprovado. Tudo auditável, em BRT.
        </motion.p>

        <motion.div className="guide-hero-g01__cta-grid guide-hero__cta--no-print" variants={guideItemVariants(rm)}>
          <motion.a
            href="#fluxo-visual"
            className="btn btn--primary guide-hero-g01__cta guide-hero-g01__cta--primary"
            {...(rm ? {} : guidePrimaryCtaHoverTap)}
          >
            <Workflow size={18} aria-hidden />
            <span className="guide-hero-g01__cta-text">Ver fluxo completo</span>
            <ChevronRight size={18} aria-hidden className="guide-hero-g01__cta-chevron" />
          </motion.a>
          <a href="#matriz-acesso" className="btn guide-hero-g01__cta guide-hero-g01__cta--outline">
            <Users size={18} aria-hidden />
            <span className="guide-hero-g01__cta-text">Conhecer papéis e permissões</span>
            <ChevronRight size={18} aria-hidden className="guide-hero-g01__cta-chevron" />
          </a>
          {tourReady ? (
            <button
              type="button"
              className="btn btn--ghost guide-hero-g01__cta guide-hero-g01__cta--ghost"
              aria-label="Iniciar trilha guiada da plataforma"
              onClick={onStartTour}
            >
              <PlayCircle size={18} aria-hidden />
              <span className="guide-hero-g01__cta-text">Iniciar trilha guiada</span>
              <ChevronRight size={18} aria-hidden className="guide-hero-g01__cta-chevron" />
            </button>
          ) : (
            <TooltipRoot>
              <TooltipTrigger asChild>
                <span className="guide-hero-g01__tooltip-anchor" tabIndex={0}>
                  <button
                    type="button"
                    className="btn btn--ghost guide-hero-g01__cta guide-hero-g01__cta--ghost"
                    aria-disabled
                    disabled
                  >
                    <PlayCircle size={18} aria-hidden />
                    <span className="guide-hero-g01__cta-text">Iniciar trilha guiada</span>
                    <ChevronRight size={18} aria-hidden className="guide-hero-g01__cta-chevron" />
                  </button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em breve</TooltipContent>
            </TooltipRoot>
          )}
        </motion.div>

        <motion.blockquote className="guide-hero-g01__pullquote typo-caption" variants={guideItemVariants(rm)}>
          Dado na franquia, validação na controladoria, leitura executiva só após aprovação — padronizado e auditável.
        </motion.blockquote>
      </motion.div>
    </section>
  );
}
