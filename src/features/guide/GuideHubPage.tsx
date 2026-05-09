import { ChevronRight, Clock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { guideSectionWhileInView } from '../../hooks/useScrollReveal';
import { estimateReadingMinutes } from '../../lib/readingTime';
import { useAccessProfile } from '../auth/useAccessProfile';
import { GUIDE_HUB_CARD_ITEMS } from './guideNav';
import { GUIDE_READING_CORPUS } from './guideReadingText';
import { GuideEndCta } from './GuideEndCta';
import { GuideHeroSection } from './GuideHeroSection';
import { GuideSectionStrip } from './GuideSectionStrip';

/**
 * Hub executivo do Guia (`/app/guide`) — cards para subpáginas e CTA final.
 */
export function GuideHubPage() {
  const accessQuery = useAccessProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const showViewerHint = accessQuery.data?.primaryRole?.code === 'viewer';

  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);

  const readingMinutes = useMemo(() => estimateReadingMinutes(GUIDE_READING_CORPUS), []);

  return (
    <>
      {showViewerHint ? (
        <div className="guide-section-inner" style={{ paddingTop: 'var(--space-4)' }}>
          <motion.div
            className="inline-message guide-page__viewer-banner typo-body"
            role="status"
            {...guideSectionWhileInView(rm)}
          >
            <strong>Modo leitura (viewer):</strong> utilize o <strong>Dashboard</strong> e este <strong>Guia</strong>.
            Submissões, aprovações e demais módulos operacionais exigem perfis com permissão explícita; o menu oculta o
            que não se aplica e atalhos diretos mostram uma página de acesso restrito.
          </motion.div>
        </div>
      ) : null}

      <GuideSectionStrip stripe="odd">
        <div className="guide-section-inner">
          <GuideHeroSection
            accessProfile={accessQuery.data}
            navigate={navigate}
            pathname={location.pathname}
          />

          <motion.div className="guide-reading-badge typo-caption" {...guideSectionWhileInView(rm)}>
            <Clock className="guide-reading-badge__icon" size={14} strokeWidth={2} aria-hidden />
            <span>Leitura completa do guia (todas as páginas): ~{readingMinutes} minutos</span>
          </motion.div>
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="even">
        <div className="guide-section-inner">
          <header className="guide-hub__intro">
            <p className="typo-eyebrow">NAVEGUE POR TEMA</p>
            <h2 className="guide-hub__title typo-h2">Conteúdo organizado por rota — URL partilhável</h2>
            <p className="guide-hub__lead typo-body-sm guide-prose-narrow">
              Escolha um bloco para aprofundar. A barra superior mantém-se estável; o contexto muda apenas quando muda
              a página.
            </p>
          </header>

          <ul className="guide-hub__cards" role="list">
            {GUIDE_HUB_CARD_ITEMS.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="guide-hub-card card">
                  <div className="guide-hub-card__body">
                    <h3 className="guide-hub-card__title typo-h3">{item.label}</h3>
                    <p className="guide-hub-card__desc typo-body-sm">{item.description}</p>
                  </div>
                  <ChevronRight className="guide-hub-card__chev" size={22} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="odd">
        <div className="guide-section-inner">
          <GuideEndCta />
        </div>
      </GuideSectionStrip>
    </>
  );
}
