import { BookOpen, FileDown, Flag, MessageSquare, PlayCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent } from '../../components/ui/sheet';
import { guidePrimaryCtaHoverTap, guideSectionWhileInView } from '../../hooks/useScrollReveal';
import { GUIDE_GLOSSARY_PANEL_INTRO, GUIDE_GLOSSARY_SHEET_BLOCKS } from './guideGlossaryContent';
import { GuideFeedbackDialog } from './GuideFeedbackDialog';
import './GuideEndCta.css';

const MotionLink = motion(Link);

export function GuideEndCta() {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const rm = Boolean(useReducedMotion());

  return (
    <>
      <motion.section
        className="guide-end-cta guide-section-target"
        id="guia-cta-final"
        data-guide-section="guia-cta-final"
        aria-labelledby="guia-cta-final-title"
        data-screenshot-id="guide-10"
        {...guideSectionWhileInView(rm)}
      >
        <div className="guide-end-cta__intro">
          <span className="guide-end-cta__eyebrow typo-eyebrow">PRÓXIMOS PASSOS</span>
          <h2 id="guia-cta-final-title" className="guide-end-cta__heading typo-h2">
            Pronto para operar — ou ainda quer entender mais?
          </h2>
          <p className="guide-end-cta__subtitle typo-body">Escolha o caminho conforme sua confiança no fluxo.</p>
        </div>

        <div className="guide-end-cta__paths">
          <article className="guide-end-cta__path guide-end-cta__path--operate">
            <div className="guide-end-cta__path-icon" aria-hidden>
              <PlayCircle strokeWidth={1.65} />
            </div>
            <h3 className="guide-end-cta__path-title typo-h3">Começar a usar agora</h3>
            <p className="guide-end-cta__path-sub typo-body-sm">Vá direto para Submissões e crie sua primeira DRE.</p>
            <MotionLink
              to="/app/submissions"
              className="btn btn--gold btn--full"
              {...(!rm ? guidePrimaryCtaHoverTap : {})}
              aria-label="Ir para a página Submissões para iniciar sua primeira DRE."
            >
              Ir para Submissões →
            </MotionLink>
          </article>

          <article className="guide-end-cta__path guide-end-cta__path--assistant">
            <div className="guide-end-cta__path-icon" aria-hidden>
              <MessageSquare strokeWidth={1.65} />
            </div>
            <h3 className="guide-end-cta__path-title typo-h3">Falar com o Assistente</h3>
            <p className="guide-end-cta__path-sub typo-body-sm">
              O Assistente DRE responde dúvidas em linguagem simples e contextualizada ao seu papel.
            </p>
            <Link
              to="/app/assistant"
              className="guide-end-cta__outline-btn typo-body-sm"
              aria-label="Abrir o Assistente DRE na página dedicada ao chat de orientação."
            >
              Abrir Assistente →
            </Link>
          </article>
        </div>

        <hr className="guide-end-cta__separator" />

        <div className="guide-end-cta__links-row">
          <button
            type="button"
            className="guide-end-cta__link-lite typo-body-sm"
            disabled
            aria-disabled="true"
            title="Em breve"
            aria-label="Baixar o guia em PDF — recurso não disponível, em breve."
          >
            <FileDown aria-hidden /> Baixar guia em PDF
          </button>

          <button
            type="button"
            className="guide-end-cta__link-lite typo-body-sm"
            onClick={() => setGlossaryOpen(true)}
            aria-label="Abrir glossário completo do Guia em um painel lateral."
          >
            <BookOpen aria-hidden /> Ver glossário completo
          </button>

          <button
            type="button"
            className="guide-end-cta__link-lite typo-body-sm"
            onClick={() => setFeedbackOpen(true)}
            aria-label="Abrir o formulário para reportar imprecisão no texto do Guia."
          >
            <Flag aria-hidden /> Reportar imprecisão
          </button>
        </div>

        <footer className="guide-end-cta__foot typo-caption">
          Última atualização: 09/05/2026 BRT · Versão 1.0
        </footer>
      </motion.section>

      <Sheet open={glossaryOpen} onOpenChange={setGlossaryOpen}>
        <SheetContent
          side="right"
          title="Glossário completo do Guia oficial"
          description="Termos institucionais da DRE e do portal Febracis"
          className="febracis-sheet__content--journey-detail"
        >
          <div className="guide-end-cta-glossary">
            <h3 className="guide-end-cta-glossary__title typo-h3">Glossário DRE — portal</h3>
            <p className="guide-end-cta-glossary__intro typo-body-sm">{GUIDE_GLOSSARY_PANEL_INTRO}</p>
            <div className="guide-end-cta-glossary__blocks">
              {GUIDE_GLOSSARY_SHEET_BLOCKS.map((block) => (
                <div key={block.heading} className="guide-end-cta-glossary__block">
                  <h4 className="typo-h4">{block.heading}</h4>
                  <p className="typo-body-sm">{block.body}</p>
                </div>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <GuideFeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
