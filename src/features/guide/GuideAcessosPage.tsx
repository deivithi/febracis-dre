import { GuideSectionStrip } from './GuideSectionStrip';
import { MatrizAcessoSection } from './MatrizAcessoSection';

/** Matriz de acesso (`/app/guide/acessos`). */
export function GuideAcessosPage() {
  return (
    <GuideSectionStrip stripe="odd">
      <div className="guide-section-inner">
        <MatrizAcessoSection />
      </div>
    </GuideSectionStrip>
  );
}
