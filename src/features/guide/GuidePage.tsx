import { Clock } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ReadingProgress } from '../../components/layout/ReadingProgress';
import { useActiveSection } from '../../hooks/useActiveSection';
import { guideSectionWhileInView } from '../../hooks/useScrollReveal';
import { estimateReadingMinutes } from '../../lib/readingTime';
import { useBreadcrumb } from '../../layouts/app/BreadcrumbContext';
import { useAccessProfile } from '../auth/useAccessProfile';
import { FlowDiagram } from './FlowDiagram';
import { GuideHeroSection } from './GuideHeroSection';
import { JourneyTrack } from './JourneyTrack';
import { GuideSectionStrip } from './GuideSectionStrip';
import { GuideTableOfContents } from './GuideTableOfContents';
import { GUIDE_READING_CORPUS } from './guideReadingText';
import { GUIDE_SECTION_IDS, GUIDE_SECTION_LABEL_BY_ID, type GuideSectionId } from './guideSections';
import './GuidePage.css';
import { useGuidePageMeta } from './useGuidePageMeta';

const GuideBelowFold = lazy(async () => import('./GuideBelowFold'));

function GuideBelowFoldFallback() {
  return (
    <div className="guide-deferred-fallback card" aria-busy="true">
      <div className="card__body">
        <p className="typo-body-sm" style={{ margin: 0 }}>
          Carregando seções do guia…
        </p>
      </div>
    </div>
  );
}

export function GuidePage() {
  useGuidePageMeta();
  const accessQuery = useAccessProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const showViewerHint = accessQuery.data?.primaryRole?.code === 'viewer';

  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [guideRoot, setGuideRoot] = useState<HTMLDivElement | null>(null);

  const activeSectionRaw = useActiveSection([...GUIDE_SECTION_IDS], {
    observeSubtreeRoot: guideRoot,
  });
  const activeSectionId: GuideSectionId | null =
    activeSectionRaw != null && (GUIDE_SECTION_IDS as readonly string[]).includes(activeSectionRaw)
      ? (activeSectionRaw as GuideSectionId)
      : null;

  const readingMinutes = useMemo(() => estimateReadingMinutes(GUIDE_READING_CORPUS), []);

  const guideBreadcrumbSegments = useMemo(
    () => [
      { label: 'Portal', href: '/app/dashboard' },
      { label: 'Guia', href: '/app/guide' },
      {
        label:
          activeSectionId != null
            ? GUIDE_SECTION_LABEL_BY_ID[activeSectionId]
            : GUIDE_SECTION_LABEL_BY_ID.hero,
      },
    ],
    [activeSectionId],
  );
  useBreadcrumb(guideBreadcrumbSegments);

  useEffect(() => {
    if (activeSectionId == null) return;
    const next = `#${activeSectionId}`;
    if (window.location.hash === next) return;
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${search}${next}`);
  }, [activeSectionId]);

  useEffect(() => {
    if (!location.pathname.endsWith('/guide')) return;
    const raw = location.hash.replace(/^#/, '');
    if (!raw) return;
    requestAnimationFrame(() => {
      document.getElementById(raw)?.scrollIntoView({ behavior: 'smooth' });
    });
  }, [location.pathname, location.hash]);

  return (
    <div
      className="guide-layout guide-page guide-g03-root"
      ref={(el) => {
        setGuideRoot(el);
      }}
    >
      <ReadingProgress enabled />

      <GuideTableOfContents
        activeSectionId={activeSectionId}
        searchInputRef={searchInputRef}
        containShortcutRoot={guideRoot}
      />

      <div className="guide-layout__content">
        {showViewerHint ? (
          <motion.div
            className="inline-message guide-page__viewer-banner typo-body"
            role="status"
            {...guideSectionWhileInView(rm)}
          >
            <strong>Modo leitura (viewer):</strong> utilize o <strong>Dashboard</strong> e este{' '}
            <strong>Guia</strong>. Submissões, aprovações e demais módulos operacionais exigem perfis com permissão
            explícita; o menu oculta o que não se aplica e atalhos diretos mostram uma página de acesso restrito.
          </motion.div>
        ) : null}

        <GuideSectionStrip stripe="odd">
          <div className="guide-section-inner">
            <GuideHeroSection accessProfile={accessQuery.data} navigate={navigate} pathname={location.pathname} />

            <motion.div className="guide-reading-badge typo-caption" {...guideSectionWhileInView(rm)}>
              <Clock className="guide-reading-badge__icon" size={14} strokeWidth={2} aria-hidden />
              <span>Leitura completa: ~{readingMinutes} minutos</span>
            </motion.div>
          </div>
        </GuideSectionStrip>

        <GuideSectionStrip stripe="even">
          <div className="guide-section-inner">
            <FlowDiagram />
          </div>
        </GuideSectionStrip>

        <GuideSectionStrip stripe="odd">
          <div className="guide-section-inner">
            <JourneyTrack showViewerHint={showViewerHint} />
          </div>
        </GuideSectionStrip>

        <Suspense fallback={<GuideBelowFoldFallback />}>
          <GuideBelowFold />
        </Suspense>
      </div>
    </div>
  );
}
