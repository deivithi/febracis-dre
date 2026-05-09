import { GuideSectionStrip } from './GuideSectionStrip';
import { DemoRoadmap } from './DemoRoadmap';

/** Roteiro da demo (`/app/guide/demo`). */
export function GuideDemoPage() {
  return (
    <GuideSectionStrip stripe="odd">
      <div className="guide-section-inner">
        <DemoRoadmap />
      </div>
    </GuideSectionStrip>
  );
}
