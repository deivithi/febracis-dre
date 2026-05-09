import { GuideSectionStrip } from './GuideSectionStrip';
import { PlatformPillars } from './PlatformPillars';

/** Pilares da plataforma (`/app/guide/pilares`). */
export function GuidePilaresPage() {
  return (
    <GuideSectionStrip stripe="odd">
      <div className="guide-section-inner">
        <PlatformPillars />
      </div>
    </GuideSectionStrip>
  );
}
