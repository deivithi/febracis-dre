import { GuideSectionStrip } from './GuideSectionStrip';
import { DreLogic } from './DreLogic';

/** Lógica técnica da DRE (`/app/guide/logica-dre`). */
export function GuideLogicaDrePage() {
  return (
    <GuideSectionStrip stripe="odd">
      <div className="guide-section-inner">
        <DreLogic />
      </div>
    </GuideSectionStrip>
  );
}
