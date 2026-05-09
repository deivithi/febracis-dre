import { GuideSectionStrip } from './GuideSectionStrip';
import { GuideJourneySection } from './GuideJourneySection';

/** Jornadas em detalhe (`/app/guide/jornadas`). */
export function GuideJornadasPage() {
  return (
    <GuideSectionStrip stripe="odd">
      <div className="guide-section-inner">
        <GuideJourneySection />
      </div>
    </GuideSectionStrip>
  );
}
