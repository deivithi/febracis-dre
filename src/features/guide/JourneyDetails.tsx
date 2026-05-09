import { ScrollText, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useIsMobileMax767 } from '../../hooks/useMediaQuery';
import {
  franchiseJourneySteps,
  reviewJourneySteps,
} from './guide-data';
import { GUIDE_HUB_PATH } from './guideNav';
import { JourneyChecklist } from './JourneyChecklist';

const JORNADAS_HEADING_ID = 'jornadas-detalhe-title';
const FLUXO_VISUAL_HREF = `${GUIDE_HUB_PATH}/fluxo#fluxo-visual`;

function FranchiseJourneyCard() {
  return (
    <div className="guide-journey-details__column">
      <header className="guide-journey-details__column-head">
        <div className="guide-journey-details__avatar" aria-hidden>
          M
        </div>
        <div className="guide-journey-details__column-titles">
          <div className="guide-journey-details__title-row">
            <Store className="guide-journey-details__col-icon" size={20} strokeWidth={2} aria-hidden />
            <h3 className="guide-journey-details__column-title typo-h3">Jornada da Franquia</h3>
          </div>
          <p className="guide-journey-details__column-role typo-caption">
            Maria <span className="guide-journey-details__role-sep">·</span> FRANQUEADA
          </p>
        </div>
      </header>
      <p className="guide-journey-details__time-badge typo-caption" aria-label="Tempo estimado por competência">
        ~3 min/competência
      </p>
      <JourneyChecklist steps={franchiseJourneySteps} />
    </div>
  );
}

function ControladoriaJourneyCard() {
  return (
    <div className="guide-journey-details__column">
      <header className="guide-journey-details__column-head">
        <div className="guide-journey-details__avatar guide-journey-details__avatar--blue" aria-hidden>
          C
        </div>
        <div className="guide-journey-details__column-titles">
          <div className="guide-journey-details__title-row">
            <ScrollText className="guide-journey-details__col-icon" size={20} strokeWidth={2} aria-hidden />
            <h3 className="guide-journey-details__column-title typo-h3">Jornada da Controladoria</h3>
          </div>
          <p className="guide-journey-details__column-role typo-caption">
            Carlos <span className="guide-journey-details__role-sep">·</span> CONTROLADORIA
          </p>
        </div>
      </header>
      <p className="guide-journey-details__time-badge typo-caption" aria-label="Tempo estimado por franquia revisada">
        ~10 min/franquia revisada
      </p>
      <JourneyChecklist steps={reviewJourneySteps} />
    </div>
  );
}

export function JourneyDetails() {
  const mobile = useIsMobileMax767();

  return (
    <section
      id="jornadas-detalhe"
      data-guide-section="jornadas-detalhe"
      className="guide-journey-details card guide-section-target"
      aria-labelledby={JORNADAS_HEADING_ID}
      data-screenshot-id="guide-06"
    >
      <div className="card__header guide-journey-details__section-head">
        <div>
          <p className="guide-journey-details__eyebrow typo-eyebrow">OS DOIS LADOS DO PROCESSO</p>
          <h2 id={JORNADAS_HEADING_ID} className="guide-journey-details__h2 card__title typo-h2">
            Cada papel tem sua própria jornada — e elas se encontram na governança.
          </h2>
        </div>
      </div>

      <div className="card__body guide-journey-details__body">
        {mobile ? (
          <Tabs defaultValue="franchise" className="guide-journey-details__tabs">
            <TabsList className="dre-logic-tabs__list" aria-label="Jornadas por papel">
              <TabsTrigger className="dre-logic-tabs__trigger typo-body-sm" value="franchise">
                Franquia
              </TabsTrigger>
              <TabsTrigger className="dre-logic-tabs__trigger typo-body-sm" value="controladoria">
                Controladoria
              </TabsTrigger>
            </TabsList>
            <TabsContent value="franchise" className="dre-logic-tabs__content">
              <FranchiseJourneyCard />
            </TabsContent>
            <TabsContent value="controladoria" className="dre-logic-tabs__content">
              <ControladoriaJourneyCard />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="guide-journey-details__grid">
            <FranchiseJourneyCard />
            <ControladoriaJourneyCard />
          </div>
        )}

        <p className="guide-journey-details__footer">
          <Link to={FLUXO_VISUAL_HREF} className="guide-journey-details__cta">
            Ver fluxo visual →
          </Link>
        </p>
      </div>
    </section>
  );
}
