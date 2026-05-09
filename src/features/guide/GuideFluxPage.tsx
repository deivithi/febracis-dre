import { useAccessProfile } from '../auth/useAccessProfile';
import { FlowDiagram } from './FlowDiagram';
import { GuideSectionStrip } from './GuideSectionStrip';
import { JourneyTrack } from './JourneyTrack';

/** Fluxo visual + trilha em 3 passos (`/app/guide/fluxo`). */
export function GuideFluxPage() {
  const accessQuery = useAccessProfile();
  const showViewerHint = accessQuery.data?.primaryRole?.code === 'viewer';

  return (
    <>
      <GuideSectionStrip stripe="odd">
        <div className="guide-section-inner">
          <FlowDiagram />
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="even">
        <div className="guide-section-inner">
          <JourneyTrack showViewerHint={Boolean(showViewerHint)} />
        </div>
      </GuideSectionStrip>
    </>
  );
}
