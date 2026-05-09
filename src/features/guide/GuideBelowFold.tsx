import { BookOpenText } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  GUIDE_VIEWPORT,
  guideItemVariants,
  guideSectionWhileInView,
  guideStaggerContainer,
} from '../../hooks/useScrollReveal';
import { DemoRoadmap } from './DemoRoadmap';
import { DreLogic } from './DreLogic';
import { PlatformPillars } from './PlatformPillars';
import { GuideEndCta } from './GuideEndCta';
import { GuideJourneySection } from './GuideJourneySection';
import { GuideSectionStrip } from './GuideSectionStrip';
import { roleMatrix } from './guide-data';

/**
 * Blocos abaixo da dobra para code-splitting (React.lazy).
 * Ordem G10: pilares → matriz → jornadas detalhe → roteiro demo → lógica DRE → CTA.
 */
export default function GuideBelowFold() {
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);
  const rowStagger = guideStaggerContainer(0.07, rm);

  return (
    <>
      <GuideSectionStrip stripe="even">
        <div className="guide-section-inner">
          <PlatformPillars />
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="odd">
        <div className="guide-section-inner">
      <motion.section
        id="matriz-acesso"
        className="card guide-section-target"
        aria-labelledby="matriz-acesso-title"
        data-guide-section="matriz-acesso"
        data-screenshot-id="guide-05"
            {...guideSectionWhileInView(rm)}
          >
            <div className="card__header">
              <div>
                <h2 id="matriz-acesso-title" className="card__title typo-h2">
                  Consulta rápida — matriz de acesso
                </h2>
                <p className="card__subtitle guide-prose-narrow typo-body-sm">
                  O papel define o que a pessoa pode fazer. O escopo define onde ela pode fazer.
                </p>
              </div>
              <BookOpenText size={18} aria-hidden />
            </div>
            <div className="card__body card__body--compact">
              <div className="table-shell guide-matrix">
                <table className="data-table guide-matrix__table">
                  <thead>
                    <tr>
                      <th scope="col" className="typo-caption">
                        Perfil
                      </th>
                      <th scope="col" className="typo-caption">
                        Escopo
                      </th>
                      <th scope="col" className="typo-caption">
                        Capacidade principal
                      </th>
                    </tr>
                  </thead>
                  <motion.tbody
                    variants={rowStagger}
                    initial="hidden"
                    whileInView="visible"
                    viewport={GUIDE_VIEWPORT}
                  >
                    {roleMatrix.map((row) => (
                      <motion.tr
                        key={row.role}
                        className={`guide-matrix__row guide-matrix__row--${row.accent}`}
                        variants={guideItemVariants(rm)}
                      >
                        <td>
                          <span className="guide-matrix__role">{row.role}</span>
                        </td>
                        <td className="typo-body-sm">{row.scope}</td>
                        <td className="typo-body-sm">{row.can}</td>
                      </motion.tr>
                    ))}
                  </motion.tbody>
                </table>
              </div>
            </div>
          </motion.section>
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="even">
        <div className="guide-section-inner">
          <GuideJourneySection />
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="odd">
        <div className="guide-section-inner">
          <DemoRoadmap />
        </div>
      </GuideSectionStrip>

      <GuideSectionStrip stripe="even">
        <div className="guide-section-inner">
          <DreLogic />
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
